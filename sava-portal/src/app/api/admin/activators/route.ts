import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { sendActivatorWelcomeEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function GET(): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const activators = await prisma.activator.findMany({
    select: { id: true, callsign: true, email: true, createdAt: true },
    orderBy: { callsign: 'asc' },
  })
  return Response.json(activators)
}

const createSchema = z.object({
  callsign: z.string().min(3).max(10),
  email: z.email(),
})

export async function POST(request: Request): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { callsign, email } = parsed.data
  const upperCall = callsign.toUpperCase()
  const plainPassword = generatePassword()
  const hashed = await bcrypt.hash(plainPassword, 12)

  try {
    const activator = await prisma.activator.create({
      data: { callsign: upperCall, email, password: hashed },
    })

    // Attempt to send email (non-fatal if it fails)
    try {
      await sendActivatorWelcomeEmail(email, upperCall, plainPassword)
    } catch (emailErr) {
      console.error('Failed to send welcome email:', emailErr)
    }

    return Response.json({
      id: activator.id,
      callsign: activator.callsign,
      email: activator.email,
      tempPassword: plainPassword, // shown once in response so admin can share manually
    }, { status: 201 })
  } catch {
    return Response.json({ error: 'Callsign or email already exists' }, { status: 409 })
  }
}
