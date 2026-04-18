import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const logFileId = parseInt(id, 10)
  if (isNaN(logFileId)) return Response.json({ error: 'Invalid id' }, { status: 400 })

  const logFile = await prisma.logFile.findUnique({ where: { id: logFileId }, select: { id: true } })
  if (!logFile) return Response.json({ error: 'Not found' }, { status: 404 })

  await prisma.logFile.delete({ where: { id: logFileId } })

  return new Response(null, { status: 204 })
}
