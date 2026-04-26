import { prisma } from '@/lib/db'
import { getSession, createSession } from '@/lib/auth'

export async function POST(
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

  const activator = await prisma.activator.findUnique({
    where: { id: activatorId },
    select: { id: true, callsign: true, mustChangePassword: true },
  })
  if (!activator) return Response.json({ error: 'Not found' }, { status: 404 })

  await createSession({
    id: activator.id,
    username: activator.callsign,
    role: 'activator',
    callsign: activator.callsign,
    mustChangePassword: activator.mustChangePassword,
  })

  return Response.json({ callsign: activator.callsign })
}
