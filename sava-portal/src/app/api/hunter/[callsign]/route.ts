import { prisma } from '@/lib/db'
import { calculateHunterStats } from '@/lib/scoring'
import type { HunterQso } from '@/lib/scoring'

export async function GET(
  _req: Request,
  ctx: RouteContext<'/api/hunter/[callsign]'>
): Promise<Response> {
  const { callsign } = await ctx.params
  const upperCall = callsign.toUpperCase()

  const qsos = await prisma.qso.findMany({
    where: { hunterCall: upperCall, isDuplicate: false },
    include: { logFile: { select: { filename: true } } },
    orderBy: { datetime: 'asc' },
  })

  const hunterQsos: HunterQso[] = qsos.map(q => ({
    id: q.id,
    activatorCall: q.activatorCall,
    frequency: q.frequency,
    band: q.band,
    mode: q.mode,
    datetime: q.datetime,
    sentRst: q.sentRst,
    rcvdRst: q.rcvdRst,
    logFileId: q.logFileId,
    logFilename: q.logFile.filename,
  }))

  const stats = calculateHunterStats(upperCall, hunterQsos)
  return Response.json(stats)
}
