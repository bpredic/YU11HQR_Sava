import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'activator') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const qsos = await prisma.qso.findMany({
    where: { logFile: { activatorId: session.id } },
    include: { logFile: { select: { filename: true } } },
    orderBy: { datetime: 'desc' },
  })

  return Response.json(qsos)
}
