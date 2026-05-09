import { prisma } from '@/lib/db'
import { validatePassword } from '@/lib/password'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
})

export async function POST(request: Request): Promise<Response> {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { token, password } = parsed.data

  const passwordError = validatePassword(password)
  if (passwordError) {
    return Response.json({ error: passwordError }, { status: 400 })
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })

  if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
    return Response.json({ error: 'invalid_token' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)

  await prisma.$transaction([
    prisma.activator.update({
      where: { id: record.activatorId },
      data: { password: hashed, mustChangePassword: false },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ])

  return Response.json({ ok: true })
}
