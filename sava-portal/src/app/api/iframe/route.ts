import { prisma } from '@/lib/db'
import { calculateHunterStats, getPointsForActivator, MIN_POINTS_FOR_DIPLOMA, REQUIRED_ACTIVATOR } from '@/lib/scoring'
import type { HunterQso } from '@/lib/scoring'

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtUtc(d: Date) {
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
}

function pointBadge(pts: number) {
  if (pts === 6) return `<span style="background:#f59e0b;color:#fff;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:700">${pts}pt</span>`
  if (pts === 2) return `<span style="background:#0284c7;color:#fff;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:700">${pts}pt</span>`
  return `<span style="background:#e2e8f0;color:#475569;padding:1px 6px;border-radius:4px;font-size:11px">${pts}pt</span>`
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const callsign = (searchParams.get('callsign') ?? '').toUpperCase().trim()

  // ── Rankings ──────────────────────────────────────────────────────────────
  const allQsos = await prisma.qso.findMany({
    where: { isDuplicate: false },
    select: { hunterCall: true, activatorCall: true, band: true, mode: true },
    orderBy: { datetime: 'asc' },
  })

  type HD = { points: number; scoringQsos: number; hasRequired: boolean; seen: Set<string> }
  const hunterMap = new Map<string, HD>()

  for (const q of allQsos) {
    const hunter = q.hunterCall.toUpperCase()
    if (!hunterMap.has(hunter)) hunterMap.set(hunter, { points: 0, scoringQsos: 0, hasRequired: false, seen: new Set() })
    const e = hunterMap.get(hunter)!
    const key = `${q.activatorCall}|${q.band}|${q.mode}`
    if (!e.seen.has(key)) {
      e.seen.add(key)
      e.points += getPointsForActivator(q.activatorCall)
      e.scoringQsos++
      if (q.activatorCall.toUpperCase() === REQUIRED_ACTIVATOR) e.hasRequired = true
    }
  }

  let rank = 1
  const rankings = [...hunterMap.entries()]
    .sort((a, b) => b[1].points - a[1].points)
    .map(([cs, d]) => ({ rank: rank++, callsign: cs, points: d.points, scoringQsos: d.scoringQsos, qualifies: d.points >= MIN_POINTS_FOR_DIPLOMA && d.hasRequired }))

  // ── Hunter stats ──────────────────────────────────────────────────────────
  let stats = null
  if (callsign) {
    const qsos = await prisma.qso.findMany({
      where: { hunterCall: callsign, isDuplicate: false },
      include: { logFile: { select: { filename: true } } },
      orderBy: { datetime: 'asc' },
    })
    const hunterQsos: HunterQso[] = qsos.map(q => ({
      id: q.id, activatorCall: q.activatorCall, frequency: q.frequency,
      band: q.band, mode: q.mode, datetime: q.datetime,
      sentRst: q.sentRst, rcvdRst: q.rcvdRst,
      logFileId: q.logFileId, logFilename: q.logFile.filename,
    }))
    stats = calculateHunterStats(callsign, hunterQsos)
  }

  // ── HTML ──────────────────────────────────────────────────────────────────
  const rankingsRows = rankings.map(r => `
    <tr>
      <td style="color:#94a3b8;text-align:right;padding:4px 8px">${r.rank}</td>
      <td style="padding:4px 8px;font-family:monospace;font-weight:600">${esc(r.callsign)}</td>
      <td style="padding:4px 8px;text-align:right;font-weight:700">${r.points}</td>
      <td style="padding:4px 8px;text-align:center">${r.qualifies ? '<span style="color:#16a34a;font-size:16px" title="Diploma">✓</span>' : ''}</td>
    </tr>`).join('')

  const statsHtml = (() => {
    if (!callsign) return `<p style="color:#94a3b8;margin-top:32px;text-align:center">Enter your callsign above to see your results.</p>`
    if (!stats || stats.qsos.length === 0) return `<p style="color:#ef4444;margin-top:16px">No QSOs found for <strong>${esc(callsign)}</strong>.</p>`

    const diplomaHtml = stats.qualifiesForDiploma
      ? `<span style="background:#16a34a;color:#fff;padding:3px 10px;border-radius:6px;font-weight:700">✓ Diploma qualified</span>`
      : `<span style="background:#e2e8f0;color:#64748b;padding:3px 10px;border-radius:6px">${stats.totalPoints}/${MIN_POINTS_FOR_DIPLOMA} pts${!stats.hasRequiredActivator ? ' · missing YT1SAVA' : ''}</span>`

    const qsoRows = stats.qsos.map(q => `
      <tr>
        <td style="padding:4px 8px;font-family:monospace;font-weight:600">${esc(q.activatorCall)}</td>
        <td style="padding:4px 8px">${esc(q.band)}</td>
        <td style="padding:4px 8px">${esc(q.mode)}</td>
        <td style="padding:4px 8px;color:#64748b;font-size:12px">${fmtUtc(q.datetime)}</td>
        <td style="padding:4px 8px;text-align:right">${q.points > 0 ? pointBadge(q.points) : '<span style="color:#94a3b8">dup</span>'}</td>
      </tr>`).join('')

    return `
      <div style="margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="font-size:20px;font-weight:700;font-family:monospace">${esc(callsign)}</span>
        <span style="font-size:18px;font-weight:700;color:#1e40af">${stats.totalPoints} pts</span>
        ${diplomaHtml}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="border-bottom:2px solid #e2e8f0">
            <th style="padding:4px 8px;text-align:left;color:#64748b;font-weight:600">Activator</th>
            <th style="padding:4px 8px;text-align:left;color:#64748b;font-weight:600">Band</th>
            <th style="padding:4px 8px;text-align:left;color:#64748b;font-weight:600">Mode</th>
            <th style="padding:4px 8px;text-align:left;color:#64748b;font-weight:600">Date/Time (UTC)</th>
            <th style="padding:4px 8px;text-align:right;color:#64748b;font-weight:600">Pts</th>
          </tr>
        </thead>
        <tbody>${qsoRows}</tbody>
      </table>`
  })()

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sava River Days 2026</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,sans-serif;font-size:13px;background:#f8fafc;color:#1e293b;display:flex;height:100vh;overflow:hidden}
    .left{width:30%;min-width:160px;border-right:1px solid #e2e8f0;overflow-y:auto;background:#fff;flex-shrink:0}
    .right{flex:1;overflow-y:auto;padding:16px;background:#f8fafc}
    .left-header{padding:10px 12px;background:#1e3a5f;color:#fff;font-weight:700;font-size:12px;letter-spacing:.5px;text-transform:uppercase;position:sticky;top:0}
    table{border-collapse:collapse;width:100%}
    tr:hover{background:#f1f5f9}
    input[type=text]{width:100%;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;font-family:monospace;text-transform:uppercase;outline:none}
    input[type=text]:focus{border-color:#3b82f6;box-shadow:0 0 0 2px #bfdbfe}
    button{padding:8px 18px;background:#1e3a5f;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-weight:600}
    button:hover{background:#1e40af}
    .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:8px}
  </style>
</head>
<body>
  <div class="left">
    <div class="left-header">Hunter Rankings</div>
    <table>
      <thead>
        <tr style="border-bottom:1px solid #e2e8f0">
          <th style="padding:4px 8px;text-align:right;color:#94a3b8;font-weight:600;font-size:11px">#</th>
          <th style="padding:4px 8px;text-align:left;color:#94a3b8;font-weight:600;font-size:11px">Call</th>
          <th style="padding:4px 8px;text-align:right;color:#94a3b8;font-weight:600;font-size:11px">Pts</th>
          <th style="padding:4px 8px;text-align:center;color:#94a3b8;font-weight:600;font-size:11px">Dip</th>
        </tr>
      </thead>
      <tbody>${rankingsRows}</tbody>
    </table>
  </div>
  <div class="right">
    <div class="section-title" style="margin-bottom:6px">Sava River Days 2026 – Hunter Lookup</div>
    <form method="GET" style="display:flex;gap:8px;margin-bottom:20px">
      <input type="text" name="callsign" value="${esc(callsign)}" placeholder="Enter your callsign…" autocomplete="off" autocorrect="off" spellcheck="false">
      <button type="submit">Search</button>
    </form>
    ${statsHtml}
  </div>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'ALLOWALL',
    },
  })
}
