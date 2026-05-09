import { prisma } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'
import { z } from 'zod'

const schema = z.object({
  callsign: z.string().min(1),
})

export async function POST(request: Request): Promise<Response> {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { callsign } = parsed.data
  const activator = await prisma.activator.findUnique({
    where: { callsign: callsign.toUpperCase() },
  })

  // Always return success to avoid leaking whether a callsign exists
  if (!activator) {
    return Response.json({ ok: true })
  }

  // Invalidate any existing unused tokens for this activator
  await prisma.passwordResetToken.updateMany({
    where: { activatorId: activator.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordResetToken.create({
    data: { activatorId: activator.id, tokenHash, expiresAt },
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const resetLink = `${baseUrl}/reset-password?token=${rawToken}`

  try {
    await sendPasswordResetEmail(activator.email, activator.callsign, resetLink)
  } catch (err) {
    console.error('Failed to send password reset email:', err)
  }

  return Response.json({ ok: true })
}
