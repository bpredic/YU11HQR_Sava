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

  const qsos = await prisma.qso.findMany({
    where: { logFileId },
    orderBy: { datetime: 'asc' },
  })

  return Response.json({ logFile, qsos })
}
