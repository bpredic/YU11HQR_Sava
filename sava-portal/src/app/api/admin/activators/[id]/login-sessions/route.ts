import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const activatorId = parseInt(id, 10)
  if (isNaN(activatorId)) return Response.json({ error: 'Invalid id' }, { status: 400 })

  const sessions = await prisma.loginSession.findMany({
    where: { activatorId },
    orderBy: { loggedInAt: 'desc' },
    select: { id: true, loggedInAt: true, ipAddress: true },
  })

  return Response.json(sessions)
}
