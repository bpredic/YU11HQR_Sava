import { prisma } from '@/lib/db'

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode')
  const now = new Date()

  const where = mode === 'upcoming'
    ? { endAt: { gt: now } }
    : { startAt: { lte: now }, endAt: { gt: now } }

  const periods = await prisma.activityPeriod.findMany({
    where,
    include: { activator: { select: { callsign: true } } },
    orderBy: { startAt: 'asc' },
  })

  const data = periods.map(p => ({
    id: p.id,
    callsign: p.activator.callsign,
    band: p.band,
    mode: p.mode,
    frequency: p.frequency,
    startAt: p.startAt.toISOString(),
    endAt: p.endAt.toISOString(),
    isActive: p.startAt <= now && p.endAt > now,
  }))

  return Response.json(data)
}
