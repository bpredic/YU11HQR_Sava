import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { ALLOWED_MODES } from '@/lib/scoring'

const KNOWN_BANDS = ['160M','80M','40M','30M','20M','17M','15M','12M','10M','6M','2M','70CM']

export async function GET(): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'activator') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const periods = await prisma.activityPeriod.findMany({
    where: { activatorId: session.id },
    orderBy: { startAt: 'asc' },
  })
  return Response.json(periods)
}

export async function POST(request: Request): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'activator') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { startAt, endAt, band, frequency, mode } = body

  const start = new Date(startAt)
  const end = new Date(endAt)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return Response.json({ error: 'Invalid date/time' }, { status: 400 })
  }
  if (start >= end) {
    return Response.json({ error: 'Start must be before end' }, { status: 400 })
  }

  const bandUpper = String(band ?? '').toUpperCase()
  const modeUpper = String(mode ?? '').toUpperCase()
  const freqKhz = Math.round(Number(frequency))

  if (!KNOWN_BANDS.includes(bandUpper)) {
    return Response.json({ error: 'Invalid band' }, { status: 400 })
  }
  if (!ALLOWED_MODES.includes(modeUpper)) {
    return Response.json({ error: 'Invalid mode' }, { status: 400 })
  }
  if (!freqKhz || freqKhz <= 0) {
    return Response.json({ error: 'Invalid frequency' }, { status: 400 })
  }

  const overlapping = await prisma.activityPeriod.findFirst({
    where: {
      activatorId: session.id,
      startAt: { lt: end },
      endAt: { gt: start },
    },
  })

  if (overlapping) {
    return Response.json({ error: 'overlap' }, { status: 409 })
  }

  const period = await prisma.activityPeriod.create({
    data: {
      activatorId: session.id,
      startAt: start,
      endAt: end,
      band: bandUpper,
      frequency: freqKhz,
      mode: modeUpper,
    },
  })

  return Response.json(period, { status: 201 })
}
