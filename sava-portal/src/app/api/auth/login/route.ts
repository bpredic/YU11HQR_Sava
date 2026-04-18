import { prisma } from '@/lib/db'
import { createSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export async function POST(request: Request): Promise<Response> {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { username, password } = parsed.data

  // Try admin user first
  const adminUser = await prisma.user.findUnique({ where: { username } })
  if (adminUser && await bcrypt.compare(password, adminUser.password)) {
    await createSession({ id: adminUser.id, username: adminUser.username, role: 'admin' })
    return Response.json({ role: 'admin' })
  }

  // Try activator (username = callsign)
  const activator = await prisma.activator.findUnique({ where: { callsign: username.toUpperCase() } })
  if (activator && await bcrypt.compare(password, activator.password)) {
    const now = new Date()
    await Promise.all([
      createSession({
        id: activator.id,
        username: activator.callsign,
        role: 'activator',
        callsign: activator.callsign,
      }),
      prisma.activator.update({
        where: { id: activator.id },
        data: { lastLoginAt: now },
      }),
      prisma.loginSession.create({
        data: { activatorId: activator.id, loggedInAt: now },
      }),
    ])
    return Response.json({ role: 'activator' })
  }

  return Response.json({ error: 'Invalid credentials' }, { status: 401 })
}
