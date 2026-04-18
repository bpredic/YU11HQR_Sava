import { prisma } from '@/lib/db'
import { getSession, createSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  password: z.string().min(8),
})

export async function POST(request: Request): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'activator') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(parsed.data.password, 12)

  await prisma.activator.update({
    where: { id: session.id },
    data: { password: hashed, mustChangePassword: false },
  })

  await createSession({
    id: session.id,
    username: session.username,
    role: 'activator',
    callsign: session.callsign,
    mustChangePassword: false,
  })

  return Response.json({ ok: true })
}
