import { prisma } from '@/lib/db'
import { calculateHunterStats } from '@/lib/scoring'
import type { HunterQso } from '@/lib/scoring'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function GET(
  _req: Request,
  ctx: RouteContext<'/api/hunter/[callsign]/diploma'>
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

  if (!stats.qualifiesForDiploma) {
    return Response.json({ error: 'Does not qualify for diploma' }, { status: 403 })
  }

  // Generate PDF diploma
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([841.89, 595.28]) // A4 landscape

  const { width, height } = page.getSize()

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Background gradient simulation with rectangles
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.04, 0.18, 0.32) })
  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, color: rgb(0.96, 0.94, 0.88) })
  page.drawRectangle({ x: 25, y: 25, width: width - 50, height: height - 50, color: rgb(0.04, 0.18, 0.32), opacity: 0.05 })

  // Decorative border lines
  const borderColor = rgb(0.12, 0.53, 0.73)
  page.drawLine({ start: { x: 30, y: height - 30 }, end: { x: width - 30, y: height - 30 }, thickness: 2, color: borderColor })
  page.drawLine({ start: { x: 30, y: 30 }, end: { x: width - 30, y: 30 }, thickness: 2, color: borderColor })
  page.drawLine({ start: { x: 30, y: 30 }, end: { x: 30, y: height - 30 }, thickness: 2, color: borderColor })
  page.drawLine({ start: { x: width - 30, y: 30 }, end: { x: width - 30, y: height - 30 }, thickness: 2, color: borderColor })

  // Title
  const titleText = 'DIPLOMA'
  const titleSize = 48
  const titleWidth = boldFont.widthOfTextAtSize(titleText, titleSize)
  page.drawText(titleText, {
    x: (width - titleWidth) / 2,
    y: height - 110,
    size: titleSize,
    font: boldFont,
    color: rgb(0.04, 0.18, 0.32),
  })

  // Subtitle
  const subtitleText = 'SAVA RIVER DAYS 2026'
  const subtitleSize = 22
  const subtitleWidth = boldFont.widthOfTextAtSize(subtitleText, subtitleSize)
  page.drawText(subtitleText, {
    x: (width - subtitleWidth) / 2,
    y: height - 145,
    size: subtitleSize,
    font: boldFont,
    color: borderColor,
  })

  // Award text
  const awardLine1 = 'This diploma is awarded to'
  const awardSize = 16
  const awardWidth1 = regularFont.widthOfTextAtSize(awardLine1, awardSize)
  page.drawText(awardLine1, {
    x: (width - awardWidth1) / 2,
    y: height - 210,
    size: awardSize,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  })

  // Callsign
  const callsignSize = 56
  const callsignWidth = boldFont.widthOfTextAtSize(upperCall, callsignSize)
  page.drawText(upperCall, {
    x: (width - callsignWidth) / 2,
    y: height - 290,
    size: callsignSize,
    font: boldFont,
    color: rgb(0.04, 0.18, 0.32),
  })

  // Achievement text
  const achieveLine = `for successfully completing the Sava River Days 2026 contest`
  const achieveSize = 13
  const achieveWidth = regularFont.widthOfTextAtSize(achieveLine, achieveSize)
  page.drawText(achieveLine, {
    x: (width - achieveWidth) / 2,
    y: height - 330,
    size: achieveSize,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  })

  const pointsLine = `with a total of ${stats.totalPoints} points`
  const pointsWidth = regularFont.widthOfTextAtSize(pointsLine, achieveSize)
  page.drawText(pointsLine, {
    x: (width - pointsWidth) / 2,
    y: height - 355,
    size: achieveSize,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  })

  // Date range
  const periodText = 'June 1 – 7, 2026'
  const periodSize = 12
  const periodWidth = regularFont.widthOfTextAtSize(periodText, periodSize)
  page.drawText(periodText, {
    x: (width - periodWidth) / 2,
    y: height - 390,
    size: periodSize,
    font: regularFont,
    color: rgb(0.4, 0.4, 0.4),
  })

  // Footer
  const footerText = 'Amateur Radio Club YU1HQR  •  Sava River Days Contest Committee'
  const footerSize = 10
  const footerWidth = regularFont.widthOfTextAtSize(footerText, footerSize)
  page.drawText(footerText, {
    x: (width - footerWidth) / 2,
    y: 55,
    size: footerSize,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  })

  const pdfBytes = await pdfDoc.save()
  const buffer = Buffer.from(pdfBytes)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Sava2026-Diploma-${upperCall}.pdf"`,
    },
  })
}
