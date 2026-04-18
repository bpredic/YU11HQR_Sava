import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const qsos = await prisma.qso.findMany({
    orderBy: { datetime: 'asc' },
    select: {
      id: true,
      activatorCall: true,
      hunterCall: true,
      frequency: true,
      band: true,
      mode: true,
      datetime: true,
      sentRst: true,
      rcvdRst: true,
      sentExch: true,
      rcvdExch: true,
      isDuplicate: true,
      logFile: { select: { filename: true } },
    },
  })

  return Response.json(qsos)
}
