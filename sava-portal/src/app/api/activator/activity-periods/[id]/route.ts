import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'activator') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const periodId = parseInt(id, 10)
  if (isNaN(periodId)) return Response.json({ error: 'Invalid id' }, { status: 400 })

  const period = await prisma.activityPeriod.findUnique({
    where: { id: periodId },
    select: { activatorId: true },
  })

  if (!period) return Response.json({ error: 'Not found' }, { status: 404 })
  if (period.activatorId !== session.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.activityPeriod.delete({ where: { id: periodId } })
  return new Response(null, { status: 204 })
}
