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
  if (pts === 6) return `<span class="pt-badge pt-amber">${pts}pt</span>`
  if (pts === 2) return `<span class="pt-badge pt-blue">${pts}pt</span>`
  return `<span class="pt-badge pt-gray">${pts}pt</span>`
}

function rankBadge(rank: number) {
  if (rank === 1) return `<span class="rank-badge gold">${rank}</span>`
  if (rank === 2) return `<span class="rank-badge silver">${rank}</span>`
  if (rank === 3) return `<span class="rank-badge bronze">${rank}</span>`
  return `<span class="rank-badge">${rank}</span>`
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

  const totalQsos = allQsos.length

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

  const totalHunters = hunterMap.size
  const qualifiedCount = rankings.filter(r => r.qualifies).length

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
    <tr class="${r.callsign === callsign ? 'row-highlight' : ''}">
      <td class="td-rank">${rankBadge(r.rank)}</td>
      <td class="td-call"><a href="?callsign=${esc(r.callsign)}" class="call-link">${esc(r.callsign)}</a></td>
      <td class="td-pts">${r.points}</td>
      <td class="td-dip">${r.qualifies ? '<span class="dip-check" title="Diploma qualified">✓</span>' : ''}</td>
    </tr>`).join('')

  const statsHtml = (() => {
    if (!callsign) return `
      <div class="empty-state">
        <div class="empty-icon">📡</div>
        <p>Enter your callsign above to see your QSOs and score.</p>
      </div>`

    if (!stats || stats.qsos.length === 0) return `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>No QSOs found for <strong class="mono">${esc(callsign)}</strong>.</p>
      </div>`

    const diplomaHtml = stats.qualifiesForDiploma
      ? `<span class="diploma-yes">✓ Diploma qualified</span>
         <a href="/api/hunter/${esc(callsign)}/diploma" target="_blank" class="diploma-btn">⬇ Download Diploma</a>`
      : `<span class="diploma-no">${stats.totalPoints} / ${MIN_POINTS_FOR_DIPLOMA} pts${!stats.hasRequiredActivator ? ' · missing YT1SAVA' : ''}</span>`

    const qsoRows = stats.qsos.map(q => `
      <tr>
        <td class="td-mono fw6">${esc(q.activatorCall)}</td>
        <td>${esc(q.band)}</td>
        <td>${esc(q.mode)}</td>
        <td class="td-time">${fmtUtc(q.datetime)}</td>
        <td class="td-pts-right">${q.points > 0 ? pointBadge(q.points) : '<span class="dup-label">dup</span>'}</td>
      </tr>`).join('')

    return `
      <div class="hunter-summary">
        <span class="hunter-call mono">${esc(callsign)}</span>
        <span class="hunter-pts">${stats.totalPoints} <span class="pts-label">pts</span></span>
        ${diplomaHtml}
      </div>
      <table class="qso-table">
        <thead>
          <tr>
            <th>Activator</th>
            <th>Band</th>
            <th>Mode</th>
            <th>Date / Time (UTC)</th>
            <th style="text-align:right">Pts</th>
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
    body{font-family:system-ui,-apple-system,sans-serif;font-size:13px;background:#f1f5f9;color:#1e293b;display:flex;flex-direction:column;height:100vh;overflow:hidden}

    /* ── Header ── */
    .site-header{background:linear-gradient(135deg,#0f2d54 0%,#1e40af 100%);color:#fff;text-align:center;padding:10px 16px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.25)}
    .site-header h1{font-size:17px;font-weight:800;letter-spacing:3px;text-transform:uppercase}
    .site-header p{font-size:10px;color:#93c5fd;letter-spacing:1.5px;margin-top:2px;text-transform:uppercase}

    /* ── Stats bar ── */
    .stats-bar{background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 20px;display:flex;align-items:center;gap:0;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .stat-item{flex:1;text-align:center;padding:4px 8px}
    .stat-item+.stat-item{border-left:1px solid #e2e8f0}
    .stat-value{font-size:36px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-1px}
    .stat-value.primary{color:#0f2d54}
    .stat-value.secondary{color:#1e40af}
    .stat-value.accent{color:#16a34a}
    .stat-label{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#94a3b8;font-weight:700;margin-top:3px}

    /* ── Two-column layout ── */
    .columns{display:flex;flex:1;overflow:hidden}
    .left{width:30%;min-width:170px;border-right:1px solid #e2e8f0;overflow-y:auto;background:#fff;flex-shrink:0;scrollbar-width:thin}
    .right{flex:1;overflow-y:auto;padding:16px 20px;background:#f8fafc;scrollbar-width:thin}

    /* ── Left panel ── */
    .left-header{padding:7px 12px;background:linear-gradient(135deg,#0f2d54 0%,#1e40af 100%);color:#fff;font-weight:700;font-size:10px;letter-spacing:.8px;text-transform:uppercase;position:sticky;top:0;z-index:10}
    table{border-collapse:collapse;width:100%}
    .rankings-table tbody tr:hover{background:#f1f5f9}
    .td-rank{padding:4px 6px 4px 8px;text-align:right}
    .td-call{padding:4px 6px;font-weight:600}
    .td-pts{padding:4px 6px;text-align:right;font-weight:700;color:#1e40af}
    .td-dip{padding:4px 8px 4px 4px;text-align:center}
    .rank-badge{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:700}
    .rank-badge.gold{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;box-shadow:0 1px 4px rgba(245,158,11,.4)}
    .rank-badge.silver{background:linear-gradient(135deg,#94a3b8,#64748b);color:#fff}
    .rank-badge.bronze{background:linear-gradient(135deg,#cd7c2f,#a16207);color:#fff}
    .call-link{color:inherit;text-decoration:none;font-family:monospace}
    .call-link:hover{color:#1e40af;text-decoration:underline}
    .dip-check{color:#16a34a;font-size:14px;font-weight:700}
    .row-highlight{background:#eff6ff!important}
    .row-highlight .call-link{color:#1e40af;font-weight:700}

    /* ── Right panel: search form ── */
    .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#94a3b8;margin-bottom:6px}
    .search-form{display:flex;gap:8px;margin-bottom:20px}
    input[type=text]{flex:1;padding:8px 12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:monospace;text-transform:uppercase;outline:none;transition:border-color .15s,box-shadow .15s;background:#fff;color:#1e293b}
    input[type=text]:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
    button{padding:8px 18px;background:linear-gradient(135deg,#0f2d54 0%,#1e40af 100%);color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;transition:opacity .15s;white-space:nowrap}
    button:hover{opacity:.85}

    /* ── Hunter summary ── */
    .hunter-summary{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;padding:12px 16px;background:#fff;border-radius:10px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.05)}
    .hunter-call{font-size:22px;font-weight:800;letter-spacing:1px}
    .hunter-pts{font-size:22px;font-weight:800;color:#1e40af}
    .pts-label{font-size:13px;font-weight:500;color:#64748b}
    .diploma-yes{background:#16a34a;color:#fff;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:4px}
    .diploma-no{background:#f1f5f9;color:#64748b;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid #e2e8f0}
    .diploma-btn{display:inline-flex;align-items:center;gap:5px;padding:4px 14px;background:linear-gradient(135deg,#15803d 0%,#16a34a 100%);color:#fff;border-radius:20px;font-size:12px;font-weight:700;text-decoration:none;transition:opacity .15s}
    .diploma-btn:hover{opacity:.85}

    /* ── QSO table ── */
    .qso-table{font-size:12px;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.05)}
    .qso-table th{padding:7px 10px;text-align:left;color:#64748b;font-weight:600;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:10px;text-transform:uppercase;letter-spacing:.4px}
    .qso-table td{padding:5px 10px;border-bottom:1px solid #f1f5f9}
    .qso-table tbody tr:last-child td{border-bottom:none}
    .qso-table tbody tr:hover td{background:#f8fafc}
    .td-mono{font-family:monospace}
    .fw6{font-weight:600}
    .td-time{color:#64748b;font-size:11px}
    .td-pts-right{text-align:right}
    .pt-badge{padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;display:inline-block}
    .pt-amber{background:#fef3c7;color:#d97706;border:1px solid #fcd34d}
    .pt-blue{background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd}
    .pt-gray{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}
    .dup-label{color:#94a3b8;font-style:italic}

    /* ── Empty state ── */
    .empty-state{text-align:center;padding:40px 20px;color:#64748b}
    .empty-icon{font-size:36px;margin-bottom:10px}
    .mono{font-family:monospace}
  </style>
</head>
<body>
  <div class="site-header">
    <h1>Sava River Days 2026</h1>
    <p>WWA-Style Amateur Radio Contest &nbsp;·&nbsp; June 1–7, 2026</p>
  </div>

  <div class="stats-bar">
    <div class="stat-item">
      <div class="stat-value primary">${totalQsos.toLocaleString('en')}</div>
      <div class="stat-label">Total QSOs</div>
    </div>
    <div class="stat-item">
      <div class="stat-value secondary">${totalHunters.toLocaleString('en')}</div>
      <div class="stat-label">Hunters</div>
    </div>
    <div class="stat-item">
      <div class="stat-value accent">${qualifiedCount.toLocaleString('en')}</div>
      <div class="stat-label">Diploma Qualified</div>
    </div>
  </div>

  <div class="columns">
    <div class="left">
      <div class="left-header">Hunter Rankings</div>
      <table class="rankings-table">
        <thead>
          <tr style="border-bottom:1px solid #e2e8f0">
            <th style="padding:5px 6px 5px 8px;text-align:right;color:#94a3b8;font-weight:600;font-size:10px;text-transform:uppercase">#</th>
            <th style="padding:5px 6px;text-align:left;color:#94a3b8;font-weight:600;font-size:10px;text-transform:uppercase">Call</th>
            <th style="padding:5px 6px;text-align:right;color:#94a3b8;font-weight:600;font-size:10px;text-transform:uppercase">Pts</th>
            <th style="padding:5px 8px 5px 4px;text-align:center;color:#94a3b8;font-weight:600;font-size:10px;text-transform:uppercase">Dip</th>
          </tr>
        </thead>
        <tbody>${rankingsRows}</tbody>
      </table>
    </div>

    <div class="right">
      <div class="section-title">Hunter Lookup</div>
      <form method="GET" class="search-form">
        <input type="text" name="callsign" value="${esc(callsign)}" placeholder="Enter your callsign…" autocomplete="off" autocorrect="off" spellcheck="false">
        <button type="submit">Search</button>
      </form>
      ${statsHtml}
    </div>
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
