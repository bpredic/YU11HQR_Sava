import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { calculateHunterStats, getPointsForActivator, REQUIRED_ACTIVATOR } from '@/lib/scoring'
import type { HunterQso } from '@/lib/scoring'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { lookupCallsign } from '@/lib/qrz'

interface DiplomaBox {
  pageWidth: number
  pageHeight: number
  box: {
    x1: number; y1: number; x2: number; y2: number
    centerX: number; centerY: number
    width: number; height: number
  }
}

let cachedBox: DiplomaBox | null = null

function loadBox(): DiplomaBox {
  if (cachedBox) return cachedBox
  const boxPath = path.join(process.cwd(), '..', 'Diploma', 'diploma-box.json')
  cachedBox = JSON.parse(fs.readFileSync(boxPath, 'utf-8')) as DiplomaBox
  return cachedBox
}

export async function GET(
  _req: Request,
  ctx: RouteContext<'/api/hunter/[callsign]/diploma'>
): Promise<Response> {
  const session = await getSession()
  const isAdmin = session?.role === 'admin'

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

  if (!stats.qualifiesForDiploma && !isAdmin) {
    return Response.json({ error: 'Does not qualify for diploma' }, { status: 403 })
  }

  // Compute rank in parallel with PDF load and QRZ lookup
  const diplomaPath = path.join(process.cwd(), '..', 'Diploma', 'Dani reke Save - DIPLOMA.pdf')
  const diplomaBytes = fs.readFileSync(diplomaPath)

  const [pdfDoc, qrzInfo, allQsos] = await Promise.all([
    PDFDocument.load(diplomaBytes),
    lookupCallsign(upperCall),
    prisma.qso.findMany({
      where: { isDuplicate: false },
      select: { hunterCall: true, activatorCall: true, band: true, mode: true },
    }),
  ])

  type HunterAgg = { points: number; hasRequired: boolean; seen: Set<string> }
  const hunterMap = new Map<string, HunterAgg>()
  for (const q of allQsos) {
    const hunter = q.hunterCall.toUpperCase()
    if (!hunterMap.has(hunter)) hunterMap.set(hunter, { points: 0, hasRequired: false, seen: new Set() })
    const entry = hunterMap.get(hunter)!
    const slot = `${q.activatorCall}|${q.band}|${q.mode}`
    if (!entry.seen.has(slot)) {
      entry.seen.add(slot)
      entry.points += getPointsForActivator(q.activatorCall)
      if (q.activatorCall.toUpperCase() === REQUIRED_ACTIVATOR) entry.hasRequired = true
    }
  }
  const sorted = [...hunterMap.entries()].sort((a, b) => b[1].points - a[1].points)
  const hunterRank = sorted.findIndex(([call]) => call === upperCall) + 1
  const totalHunters = sorted.length
  const page = pdfDoc.getPage(0)

  const { box } = loadBox()
  const [boldFont, regularFont] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
    pdfDoc.embedFont(StandardFonts.Helvetica),
  ])

  // Font sized to fill ~95% of box height; cap height ≈ 72% of em
  const fontSize = Math.round(box.height * 0.95)
  const textWidth = boldFont.widthOfTextAtSize(upperCall, fontSize)

  // Center horizontally in the box; center vertically by cap height, shifted 5% of font down
  const x = box.centerX - textWidth / 2
  const y = box.centerY - fontSize * 0.36 - fontSize * 0.05

  page.drawText(upperCall, {
    x,
    y,
    size: fontSize,
    font: boldFont,
    color: rgb(0.04, 0.18, 0.32),
  })

  const infoFontSize = Math.round(fontSize * 0.45)
  const infoColor = rgb(0.04, 0.18, 0.32)

  // QRZ info: two lines above callsign
  // Address line baseline: 1× callsign-height + 1.5× info-font above callsign baseline
  // Name line baseline: one info-font-height above address line
  if (qrzInfo) {
    const addrLineY = y + fontSize + infoFontSize * 1.5
    const nameLineY = addrLineY + infoFontSize

    const nameLine = qrzInfo.nameFmt ?? [qrzInfo.firstName, qrzInfo.lastName].filter(Boolean).join(' ')
    if (nameLine) {
      const nameWidth = regularFont.widthOfTextAtSize(nameLine, infoFontSize)
      page.drawText(nameLine, {
        x: box.centerX - nameWidth / 2,
        y: nameLineY,
        size: infoFontSize,
        font: regularFont,
        color: infoColor,
      })
    }

    const addrFontSize = Math.round(infoFontSize * 0.7)
    const cityZip = [qrzInfo.city, qrzInfo.zip].filter(Boolean).join(' ')
    const addrLine = [qrzInfo.addr1, cityZip, qrzInfo.country].filter(Boolean).join(', ')
    if (addrLine) {
      const addrWidth = regularFont.widthOfTextAtSize(addrLine, addrFontSize)
      page.drawText(addrLine, {
        x: box.centerX - addrWidth / 2,
        y: addrLineY,
        size: addrFontSize,
        font: regularFont,
        color: infoColor,
      })
    }
  }

  // Rank: below callsign, offset down by one callsign font height; bold with shadow
  if (hunterRank > 0) {
    const rankText = `#${hunterRank} of ${totalHunters}`
    const rankWidth = boldFont.widthOfTextAtSize(rankText, infoFontSize)
    const rankX = box.centerX - rankWidth / 2
    const rankY = y - fontSize
    // Shadow: offset 2pt right and 2pt down, semi-transparent dark
    page.drawText(rankText, {
      x: rankX + 2,
      y: rankY - 2,
      size: infoFontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
      opacity: 0.3,
    })
    // Main text
    page.drawText(rankText, {
      x: rankX,
      y: rankY,
      size: infoFontSize,
      font: boldFont,
      color: infoColor,
    })
  }

  const pdfBytes = await pdfDoc.save()
  const buffer = Buffer.from(pdfBytes)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Sava2026-Diploma-${upperCall}.pdf"`,
    },
  })
}
