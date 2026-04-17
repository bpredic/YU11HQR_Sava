import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'activator') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const logs = await prisma.logFile.findMany({
    where: { activatorId: session.id },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      filename: true,
      fileType: true,
      uploadedAt: true,
      qsoCount: true,
      firstQsoAt: true,
      lastQsoAt: true,
    },
  })
  return Response.json(logs)
}
