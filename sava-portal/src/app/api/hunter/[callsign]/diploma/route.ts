import fs from 'fs'
import path from 'path'
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

  const diplomaPath = path.join(process.cwd(), '..', 'Diploma', 'SAVADiploma.png')
  const diplomaBytes = fs.readFileSync(diplomaPath)

  const pdfDoc = await PDFDocument.create()
  const pngImage = await pdfDoc.embedPng(diplomaBytes)
  const { width: imgW, height: imgH } = pngImage

  const page = pdfDoc.addPage([imgW, imgH])
  page.drawImage(pngImage, { x: 0, y: 0, width: imgW, height: imgH })

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Print callsign centered horizontally, in the middle of the decorative frame
  const callsignSize = Math.round(imgH * 0.09)
  const callsignWidth = boldFont.widthOfTextAtSize(upperCall, callsignSize)
  page.drawText(upperCall, {
    x: (imgW - callsignWidth) / 2,
    // Frame center is ~52% from top → ~48% from bottom in pdf-lib coords
    y: imgH * 0.46,
    size: callsignSize,
    font: boldFont,
    color: rgb(0.04, 0.18, 0.32),
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
