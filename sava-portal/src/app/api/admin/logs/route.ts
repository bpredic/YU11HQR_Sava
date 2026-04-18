import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const logs = await prisma.logFile.findMany({
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      filename: true,
      fileType: true,
      uploadedAt: true,
      qsoCount: true,
      firstQsoAt: true,
      lastQsoAt: true,
      activator: { select: { callsign: true } },
    },
  })

  return Response.json(logs)
}
