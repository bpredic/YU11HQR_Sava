import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { calculateHunterStats } from '@/lib/scoring'
import type { HunterQso } from '@/lib/scoring'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

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

  const diplomaPath = path.join(process.cwd(), '..', 'Diploma', 'Dani reke Save - DIPLOMA.pdf')
  const diplomaBytes = fs.readFileSync(diplomaPath)

  const pdfDoc = await PDFDocument.load(diplomaBytes)
  const page = pdfDoc.getPage(0)

  const { box } = loadBox()
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

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

  const pdfBytes = await pdfDoc.save()
  const buffer = Buffer.from(pdfBytes)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Sava2026-Diploma-${upperCall}.pdf"`,
    },
  })
}
