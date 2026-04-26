import { prisma } from '@/lib/db'

export async function GET(): Promise<Response> {
  const now = new Date()
  const periods = await prisma.activityPeriod.findMany({
    where: {
      startAt: { lte: now },
      endAt: { gt: now },
    },
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
  }))

  return Response.json(data)
}
