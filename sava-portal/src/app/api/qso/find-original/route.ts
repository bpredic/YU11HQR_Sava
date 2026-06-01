import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: Request): Promise<Response> {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const activatorCall = searchParams.get('activatorCall') ?? ''
  const hunterCall = searchParams.get('hunterCall') ?? ''
  const band = searchParams.get('band') ?? ''
  const mode = searchParams.get('mode') ?? ''

  if (!activatorCall || !hunterCall || !band || !mode) {
    return Response.json({ error: 'Missing params' }, { status: 400 })
  }

  const qso = await prisma.qso.findFirst({
    where: { activatorCall, hunterCall, band, mode, isDuplicate: false },
    orderBy: { id: 'asc' },
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
