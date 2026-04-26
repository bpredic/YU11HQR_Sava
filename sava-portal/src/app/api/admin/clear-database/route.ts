import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function DELETE(): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.qso.deleteMany()
  await prisma.logFile.deleteMany()

  return new Response(null, { status: 204 })
}
