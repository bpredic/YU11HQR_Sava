import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  _req: Request,
  ctx: RouteContext<'/api/activator/logs/[id]/qsos'>
): Promise<Response> {
  const session = await getSession()
  if (!session || (session.role !== 'activator' && session.role !== 'admin')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  const logFileId = parseInt(id, 10)

  // Admins can view any log file; activators only their own
  const logFile = await prisma.logFile.findFirst({
    where: session.role === 'admin'
      ? { id: logFileId }
      : { id: logFileId, activatorId: session.id },
  })
  if (!logFile) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  // Get all QSOs from this file with cross-reference confirmation status
  const qsos = await prisma.qso.findMany({
    where: { logFileId },
    orderBy: { datetime: 'asc' },
  })

  // For each QSO from this activator, check if the hunter uploaded a matching QSO
  // (cross-reference: hunter log with activatorCall == hunterCall and vice versa)
  const enriched = await Promise.all(qsos.map(async (qso) => {
    // Look for a matching QSO from the other side (hunter confirming)
    const confirmed = await prisma.qso.findFirst({
      where: {
        activatorCall: qso.hunterCall,
        hunterCall: qso.activatorCall,
        band: qso.band,
        mode: qso.mode,
        datetime: {
          gte: new Date(qso.datetime.getTime() - 10 * 60 * 1000),
          lte: new Date(qso.datetime.getTime() + 10 * 60 * 1000),
        },
        logFileId: { not: logFileId },
      },
    })
    return { ...qso, confirmed: !!confirmed }
  }))

  return Response.json({ logFile, qsos: enriched })
}
