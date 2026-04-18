import { prisma } from '@/lib/db'
import { getSession, createSession } from '@/lib/auth'
import { validatePassword } from '@/lib/password'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1),
  password: z.string().min(1),
})

export async function POST(request: Request): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 })
  }

  const error = validatePassword(parsed.data.password)
  if (error) return Response.json({ error }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: session.id } })
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 })

  const currentOk = await bcrypt.compare(parsed.data.currentPassword, user.password)
  if (!currentOk) return Response.json({ error: 'wrongCurrent' }, { status: 400 })

  const hashed = await bcrypt.hash(parsed.data.password, 12)
  await prisma.user.update({
    where: { id: session.id },
    data: { password: hashed },
  })

  await createSession({ id: session.id, username: session.username, role: 'admin' })

  return Response.json({ ok: true })
}
