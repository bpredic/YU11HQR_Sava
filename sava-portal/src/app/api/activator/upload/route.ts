import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { parseCabrillo } from '@/lib/parsers/cabrillo'
import { parseAdif } from '@/lib/parsers/adif'

// Insert QSOs in chunks to stay within SQLite parameter limits
const CHUNK_SIZE = 200

type QsoRow = {
  logFileId: number
  activatorCall: string
  hunterCall: string
  frequency: number
  band: string
  mode: string
  datetime: Date
  sentRst: string
  rcvdRst: string
  sentExch: string | null
  rcvdExch: string | null
  isDuplicate: boolean
  duplicateOfId: number | null
}

type DuplicateSummary = {
  activatorCall: string
  hunterCall: string
  band: string
  mode: string
  datetime: Date
  existingFilename?: string
  existingUploadedAt?: Date
  existingActivatorCall?: string
}

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
    return Response.json(
      { error: 'Unrecognized file format. Upload .log (Cabrillo) or .adi/.adif (ADIF) files.' },
      { status: 400 },
    )
  }

  const { qsos, errors } = parseResult

  if (qsos.length === 0) {
    return Response.json({ error: 'No valid QSOs found in file', parseErrors: errors }, { status: 400 })
  }

  // Compute first/last QSO times without spread operator to avoid stack overflow on large arrays
  let minMs = qsos[0].datetime.getTime()
  let maxMs = minMs
  for (const q of qsos) {
    const ms = q.datetime.getTime()
    if (ms < minMs) minMs = ms
    if (ms > maxMs) maxMs = ms
  }

  const logFile = await prisma.logFile.create({
    data: {
      activatorId: session.id,
      filename,
      fileType,
      qsoCount: 0,
      firstQsoAt: new Date(minMs),
      lastQsoAt: new Date(maxMs),
    },
  })

  // ONE query: all non-duplicate QSOs for any hunter in this file
  // A hunter can only score once per band+mode regardless of activator — first uploaded wins.
  const hunterCallSet = new Set(qsos.map(q => q.hunterCall))

  const existingQsos = await prisma.qso.findMany({
    where: {
      hunterCall: { in: [...hunterCallSet] },
      logFileId: { not: logFile.id },
      isDuplicate: false,
    },
    select: {
      id: true,
      activatorCall: true,
      hunterCall: true,
      band: true,
      mode: true,
      logFile: {
        select: {
          filename: true,
          uploadedAt: true,
          activator: { select: { callsign: true } },
        },
      },
    },
  })

  // Map: "hunterCall|band|mode" → first existing entry (first uploaded wins)
  type MapEntry = {
    id: number
    filename?: string
    uploadedAt?: Date
    activatorCall?: string
  }
  const existingMap = new Map<string, MapEntry>()

  for (const eq of existingQsos) {
    const key = `${eq.hunterCall}|${eq.band}|${eq.mode}`
    if (!existingMap.has(key)) {
      existingMap.set(key, {
        id: eq.id,
        filename: eq.logFile.filename,
        uploadedAt: eq.logFile.uploadedAt,
        activatorCall: eq.logFile.activator.callsign,
      })
    }
  }

  const toInsert: QsoRow[] = []
  const duplicates: DuplicateSummary[] = []
  let newCount = 0
  let dupCount = 0

  for (const qso of qsos) {
    const key = `${qso.hunterCall}|${qso.band}|${qso.mode}`
    const matchEntry = existingMap.get(key)

    if (matchEntry) {
      dupCount++
      toInsert.push({
        logFileId: logFile.id,
        activatorCall: qso.activatorCall,
        hunterCall: qso.hunterCall,
        frequency: qso.frequency,
        band: qso.band,
        mode: qso.mode,
        datetime: qso.datetime,
        sentRst: qso.sentRst,
        rcvdRst: qso.rcvdRst,
        sentExch: qso.sentExch ?? null,
        rcvdExch: qso.rcvdExch ?? null,
        isDuplicate: true,
        duplicateOfId: matchEntry.id > 0 ? matchEntry.id : null,
      })
      duplicates.push({
        activatorCall: qso.activatorCall,
        hunterCall: qso.hunterCall,
        band: qso.band,
        mode: qso.mode,
        datetime: qso.datetime,
        existingFilename: matchEntry.filename,
        existingUploadedAt: matchEntry.uploadedAt,
        existingActivatorCall: matchEntry.activatorCall,
      })
    } else {
      newCount++
      // Claim this hunter|band|mode slot so later QSOs in the same file are duplicates
      existingMap.set(key, { id: 0 })
      toInsert.push({
        logFileId: logFile.id,
        activatorCall: qso.activatorCall,
        hunterCall: qso.hunterCall,
        frequency: qso.frequency,
        band: qso.band,
        mode: qso.mode,
        datetime: qso.datetime,
        sentRst: qso.sentRst,
        rcvdRst: qso.rcvdRst,
        sentExch: qso.sentExch ?? null,
        rcvdExch: qso.rcvdExch ?? null,
        isDuplicate: false,
        duplicateOfId: null,
      })
    }
  }

  // Batch insert in chunks to avoid SQLite parameter limits
  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    await prisma.qso.createMany({ data: toInsert.slice(i, i + CHUNK_SIZE) })
  }

  await prisma.logFile.update({
    where: { id: logFile.id },
    data: { qsoCount: qsos.length },
  })

  return Response.json(
    {
      logFileId: logFile.id,
      filename,
      fileType,
      totalQsos: qsos.length,
      newQsos: newCount,
      duplicateQsos: dupCount,
      firstQsoAt: new Date(minMs).toISOString(),
      lastQsoAt: new Date(maxMs).toISOString(),
      parseErrors: errors,
    },
    { status: 201 },
  )
}
