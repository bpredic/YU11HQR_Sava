import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { parseCabrillo } from '@/lib/parsers/cabrillo'
import { parseAdif } from '@/lib/parsers/adif'

export async function POST(request: Request): Promise<Response> {
  const session = await getSession()
  if (!session || session.role !== 'activator') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 })
  }

  const filename = file.name
  const content = await file.text()
  const ext = filename.split('.').pop()?.toLowerCase()

  let parseResult
  let fileType: string

  if (ext === 'log' || content.includes('START-OF-LOG')) {
    parseResult = parseCabrillo(content)
    fileType = 'cabrillo'
  } else if (ext === 'adi' || ext === 'adif' || content.includes('<EOH>') || content.includes('<EOR>')) {
    parseResult = parseAdif(content)
    fileType = 'adif'
  } else {
    return Response.json({ error: 'Unrecognized file format. Upload .log (Cabrillo) or .adi/.adif (ADIF) files.' }, { status: 400 })
  }

  const { qsos, errors } = parseResult

  if (qsos.length === 0) {
    return Response.json({ error: 'No valid QSOs found in file', parseErrors: errors }, { status: 400 })
  }

  const activatorId = session.id

  // Create log file record first
  const datetimes = qsos.map(q => q.datetime.getTime())
  const firstQsoAt = new Date(Math.min(...datetimes))
  const lastQsoAt = new Date(Math.max(...datetimes))

  const logFile = await prisma.logFile.create({
    data: {
      activatorId,
      filename,
      fileType,
      qsoCount: 0,
      firstQsoAt,
      lastQsoAt,
    },
  })

  // Check for duplicates against existing QSOs in the database
  let newCount = 0
  let dupCount = 0
  const duplicates: Array<{
    qso: typeof qsos[0],
    existingLogFileId: number,
    existingActivatorCall: string,
    existingUploadedAt: Date,
    existingFilename: string,
  }> = []

  for (const qso of qsos) {
    // A duplicate is same activatorCall + hunterCall + band + mode within same 5-minute window
    const windowStart = new Date(qso.datetime.getTime() - 5 * 60 * 1000)
    const windowEnd = new Date(qso.datetime.getTime() + 5 * 60 * 1000)

    const existing = await prisma.qso.findFirst({
      where: {
        activatorCall: qso.activatorCall,
        hunterCall: qso.hunterCall,
        band: qso.band,
        mode: qso.mode,
        datetime: { gte: windowStart, lte: windowEnd },
        logFileId: { not: logFile.id },
      },
      include: { logFile: { include: { activator: true } } },
    })

    if (existing) {
      dupCount++
      duplicates.push({
        qso,
        existingLogFileId: existing.logFileId,
        existingActivatorCall: existing.activatorCall,
        existingUploadedAt: existing.logFile.uploadedAt,
        existingFilename: existing.logFile.filename,
      })
      await prisma.qso.create({
        data: {
          logFileId: logFile.id,
          activatorCall: qso.activatorCall,
          hunterCall: qso.hunterCall,
          frequency: qso.frequency,
          band: qso.band,
          mode: qso.mode,
          datetime: qso.datetime,
          sentRst: qso.sentRst,
          rcvdRst: qso.rcvdRst,
          sentExch: qso.sentExch,
          rcvdExch: qso.rcvdExch,
          isDuplicate: true,
          duplicateOfId: existing.id,
        },
      })
    } else {
      newCount++
      await prisma.qso.create({
        data: {
          logFileId: logFile.id,
          activatorCall: qso.activatorCall,
          hunterCall: qso.hunterCall,
          frequency: qso.frequency,
          band: qso.band,
          mode: qso.mode,
          datetime: qso.datetime,
          sentRst: qso.sentRst,
          rcvdRst: qso.rcvdRst,
          sentExch: qso.sentExch,
          rcvdExch: qso.rcvdExch,
          isDuplicate: false,
        },
      })
    }
  }

  // Update log file QSO count
  await prisma.logFile.update({
    where: { id: logFile.id },
    data: { qsoCount: qsos.length },
  })

  return Response.json({
    logFileId: logFile.id,
    filename,
    fileType,
    totalQsos: qsos.length,
    newQsos: newCount,
    duplicateQsos: dupCount,
    duplicates: duplicates.map(d => ({
      activatorCall: d.qso.activatorCall,
      hunterCall: d.qso.hunterCall,
      band: d.qso.band,
      mode: d.qso.mode,
      datetime: d.qso.datetime,
      existingActivatorCall: d.existingActivatorCall,
      existingFilename: d.existingFilename,
      existingUploadedAt: d.existingUploadedAt,
    })),
    parseErrors: errors,
  }, { status: 201 })
}
