import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  _req: Request,
  ctx: RouteContext<'/api/qso/[id]'>
): Promise<Response> {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const qsoId = parseInt(id, 10)
  if (isNaN(qsoId)) return Response.json({ error: 'Invalid id' }, { status: 400 })

  const qso = await prisma.qso.findUnique({
    where: { id: qsoId },
    select: {
      id: true,
      activatorCall: true,
      hunterCall: true,
      band: true,
      mode: true,
      frequency: true,
      datetime: true,
      sentRst: true,
      rcvdRst: true,
      logFile: { select: { filename: true } },
    },
  })

  if (!qso) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(qso)
}
