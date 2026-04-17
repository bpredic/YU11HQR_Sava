import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function DELETE(
  _req: Request,
  ctx: RouteContext<'/api/admin/activators/[id]'>
): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  const numId = parseInt(id, 10)

  await prisma.activator.delete({ where: { id: numId } })
  return Response.json({ ok: true })
}
