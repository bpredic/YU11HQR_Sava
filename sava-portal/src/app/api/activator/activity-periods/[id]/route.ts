import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { ALLOWED_MODES } from '@/lib/scoring'

const KNOWN_BANDS = ['160M','80M','40M','30M','20M','17M','15M','12M','10M','6M','2M','70CM']

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'activator') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const periodId = parseInt(id, 10)
  if (isNaN(periodId)) return Response.json({ error: 'Invalid id' }, { status: 400 })

  const existing = await prisma.activityPeriod.findUnique({
    where: { id: periodId },
    select: { activatorId: true, startAt: true },
  })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })
  if (existing.activatorId !== session.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { startAt, endAt, band, frequency, mode, callsign } = body

  const start = new Date(startAt)
  const end = new Date(endAt)
  const now = new Date()

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return Response.json({ error: 'Invalid date/time' }, { status: 400 })
  }
  if (start >= end) {
    return Response.json({ error: 'Start must be before end' }, { status: 400 })
  }
  if (end <= now) {
    return Response.json({ error: 'past' }, { status: 400 })
  }
  // Allow keeping an already-started period's start unchanged; reject only if start was moved into the past
  if (Math.abs(start.getTime() - existing.startAt.getTime()) > 60_000 && start < now) {
    return Response.json({ error: 'past' }, { status: 400 })
  }

  const bandUpper = String(band ?? '').toUpperCase()
  const modeUpper = String(mode ?? '').toUpperCase()
  const freqKhz = Math.round(Number(frequency))
  const callsignUpper = String(callsign ?? session.callsign!).toUpperCase()

  const ALLOWED_CALLSIGNS = [session.callsign!.toUpperCase(), 'YU1HQR', 'YT1SAVA']
  if (!ALLOWED_CALLSIGNS.includes(callsignUpper)) return Response.json({ error: 'Invalid callsign' }, { status: 400 })
  if (!KNOWN_BANDS.includes(bandUpper)) return Response.json({ error: 'Invalid band' }, { status: 400 })
  if (!ALLOWED_MODES.includes(modeUpper)) return Response.json({ error: 'Invalid mode' }, { status: 400 })
  if (!freqKhz || freqKhz <= 0) return Response.json({ error: 'Invalid frequency' }, { status: 400 })

  const overlapping = await prisma.activityPeriod.findFirst({
    where: {
      activatorId: session.id,
      id: { not: periodId },
      startAt: { lt: end },
      endAt: { gt: start },
    },
  })
  if (overlapping) return Response.json({ error: 'overlap' }, { status: 409 })

  const updated = await prisma.activityPeriod.update({
    where: { id: periodId },
    data: { callsign: callsignUpper, startAt: start, endAt: end, band: bandUpper, frequency: freqKhz, mode: modeUpper },
  })

  return Response.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'activator') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const periodId = parseInt(id, 10)
  if (isNaN(periodId)) return Response.json({ error: 'Invalid id' }, { status: 400 })

  const period = await prisma.activityPeriod.findUnique({
    where: { id: periodId },
    select: { activatorId: true },
  })

  if (!period) return Response.json({ error: 'Not found' }, { status: 404 })
  if (period.activatorId !== session.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.activityPeriod.delete({ where: { id: periodId } })
  return new Response(null, { status: 204 })
}
