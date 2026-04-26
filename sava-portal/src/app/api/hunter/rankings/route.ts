import { prisma } from '@/lib/db'
import { getPointsForActivator, MIN_POINTS_FOR_DIPLOMA, REQUIRED_ACTIVATOR } from '@/lib/scoring'

export type RankingEntry = {
  rank: number
  callsign: string
  totalPoints: number
  scoringQsos: number
  qualifiesForDiploma: boolean
}

export async function GET(): Promise<Response> {
  const qsos = await prisma.qso.findMany({
    where: { isDuplicate: false },
    select: { hunterCall: true, activatorCall: true, band: true, mode: true },
    orderBy: { datetime: 'asc' },
  })

  type HunterData = { points: number; scoringQsos: number; hasRequired: boolean; seen: Set<string> }
  const hunterMap = new Map<string, HunterData>()

  for (const q of qsos) {
    const hunter = q.hunterCall.toUpperCase()
    if (!hunterMap.has(hunter)) {
      hunterMap.set(hunter, { points: 0, scoringQsos: 0, hasRequired: false, seen: new Set() })
    }
    const entry = hunterMap.get(hunter)!
    const slotKey = `${q.band}|${q.mode}`
    if (!entry.seen.has(slotKey)) {
      entry.seen.add(slotKey)
      entry.points += getPointsForActivator(q.activatorCall)
      entry.scoringQsos++
      if (q.activatorCall.toUpperCase() === REQUIRED_ACTIVATOR) entry.hasRequired = true
    }
  }

  let rank = 1
  const rankings: RankingEntry[] = [...hunterMap.entries()]
    .sort((a, b) => b[1].points - a[1].points)
    .map(([callsign, data]) => ({
      rank: rank++,
      callsign,
      totalPoints: data.points,
      scoringQsos: data.scoringQsos,
      qualifiesForDiploma: data.points >= MIN_POINTS_FOR_DIPLOMA && data.hasRequired,
    }))

  return Response.json(rankings)
}
