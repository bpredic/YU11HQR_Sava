import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { sendActivatorWelcomeEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'

function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(
  _req: Request,
  ctx: RouteContext<'/api/admin/activators/[id]/reset-password'>
): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  const numId = parseInt(id, 10)

  const activator = await prisma.activator.findUnique({ where: { id: numId } })
  if (!activator) {
    return Response.json({ error: 'Activator not found' }, { status: 404 })
  }

  const plainPassword = generatePassword()
  const hashed = await bcrypt.hash(plainPassword, 12)

  await prisma.activator.update({
    where: { id: numId },
    data: { password: hashed },
  })

  try {
    await sendActivatorWelcomeEmail(activator.email, activator.callsign, plainPassword)
  } catch (emailErr) {
    console.error('Failed to send reset email:', emailErr)
  }

  return Response.json({ tempPassword: plainPassword })
}
