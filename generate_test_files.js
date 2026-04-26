#!/usr/bin/env node
'use strict';

// ── Config ────────────────────────────────────────────────────────────────────
// All 20 contest activators (from scoring.ts)
const ACTIVATORS = [
  'YT1SAVA', 'YU1HQR', 'YU1FI',   'YU1XO',  'YT1TU',
  'YU4LUM',  'YU4URM', 'YU4CFA',  'YU4NPV', 'YU4RDX',
  'YU4BCP',  'YU5TM',  'YU5DR',   'YT5FDE', 'YT5TNM',
  'YT5WA',   'YT5MM',  'YU6DEJ',  'YU6DMR', 'YT1T',
];

const POINT_VALUES = { YT1SAVA: 6, YU1HQR: 2 };
function pts(act) { return POINT_VALUES[act] ?? 1; }

// 1-pt activators (all except the two special ones)
const PT1_ACTS = ACTIVATORS.filter(a => !POINT_VALUES[a]);  // 18 activators

// Exactly 20 band+mode slots (5 bands × 4 modes) – one slot per activator per
// qualifying hunter so all 20 contacts land on distinct band/mode keys.
const SLOTS = [
  { band: '80M', mode: 'CW',  freqs: [3510, 3520, 3530, 3540] },
  { band: '80M', mode: 'SSB', freqs: [3650, 3700, 3725, 3760] },
  { band: '80M', mode: 'FT8', freqs: [3573] },
  { band: '80M', mode: 'FM',  freqs: [3790] },

  { band: '40M', mode: 'CW',  freqs: [7010, 7018, 7026, 7035] },
  { band: '40M', mode: 'SSB', freqs: [7100, 7140, 7165, 7190] },
  { band: '40M', mode: 'FT8', freqs: [7074] },
  { band: '40M', mode: 'FM',  freqs: [7090] },

  { band: '20M', mode: 'CW',  freqs: [14010, 14025, 14040, 14055] },
  { band: '20M', mode: 'SSB', freqs: [14200, 14235, 14265, 14310] },
  { band: '20M', mode: 'FT8', freqs: [14074] },
  { band: '20M', mode: 'FM',  freqs: [14280] },

  { band: '15M', mode: 'CW',  freqs: [21010, 21025, 21040] },
  { band: '15M', mode: 'SSB', freqs: [21200, 21260, 21340] },
  { band: '15M', mode: 'FT8', freqs: [21074] },
  { band: '15M', mode: 'FM',  freqs: [21400] },

  { band: '10M', mode: 'CW',  freqs: [28010, 28025, 28040] },
  { band: '10M', mode: 'SSB', freqs: [28400, 28500, 28600] },
  { band: '10M', mode: 'FT8', freqs: [28074] },
  { band: '10M', mode: 'FM',  freqs: [29000] },
];
// 5 × 4 = 20 slots – exactly enough for one qualifying hunter contact per activator

const N_SLOTS  = SLOTS.length;         // 20
const N_ACT    = ACTIVATORS.length;    // 20
if (N_SLOTS !== N_ACT) throw new Error('Slot count must equal activator count');

const TOTAL_HUNTERS = 7800;
const DUP_RATE      = 0.02;

// Contest period June 1–7, 2026 UTC
const START_MS = new Date('2026-06-01T06:00:00Z').getTime();
const END_MS   = new Date('2026-06-07T20:00:00Z').getTime();

const fs   = require('fs');
const path = require('path');

// ── Seeded RNG (Mulberry32) ───────────────────────────────────────────────────
let _seed = 0xC0FFEE42;
function rng() {
  _seed |= 0; _seed = (_seed + 0x6D2B79F5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
}
function ri(min, max) { return min + Math.floor(rng() * (max - min + 1)); }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Callsign pool ─────────────────────────────────────────────────────────────
const PFXS = [
  'YU1','YU2','YU3','YU4','YU5','YU6','YU7',
  'YT1','YT2','YT3','YT4','YT5','YT6','YT7',
  'HA', 'S5', 'OE', 'DL', '9A', 'PA', 'OK', 'SP', 'OM',
  'G',  'F',  'I',  'OZ', 'SM', 'LA', 'OH', 'ES', 'LY',
  'UA3','UA6','UR',  '4O', 'Z3',
];
const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ACT_SET = new Set(ACTIVATORS);

function makeCall(i) {
  const p = PFXS[i % PFXS.length];
  const n = Math.floor(i / PFXS.length);
  return `${p}${L[n % 26]}${L[Math.floor(n / 26) % 26]}`;
}

const HUNTERS = [];
for (let i = 0; HUNTERS.length < TOTAL_HUNTERS; i++) {
  const cs = makeCall(i);
  if (!ACT_SET.has(cs)) HUNTERS.push(cs);
}

// ── Group definitions ─────────────────────────────────────────────────────────
// [fraction, qualify, target_pts_or_null]
const GROUP_DEF = [
  [0.40, true,  null],
  [0.10, false, 1],
  [0.10, false, 2],
  [0.10, false, 3],
  [0.10, false, 4],
  [0.05, false, 5],
  [0.05, false, 6],
  [0.05, false, 7],
  [0.05, false, 8],
];

// Cumulative hunter count per group
const GROUPS = (() => {
  let cum = 0;
  return GROUP_DEF.map(([f, q, t]) => { cum += f * TOTAL_HUNTERS; return { limit: cum, qualify: q, target: t }; });
})();

function groupOf(idx) {
  for (const g of GROUPS) if (idx < g.limit) return g;
  return GROUPS[GROUPS.length - 1];
}

// ── QSO assignment per hunter ─────────────────────────────────────────────────
// Qualifying hunters (40%):
//   Use all 20 slots – one per activator in a random slot order.
//   Scoring: 1×YT1SAVA(6) + 1×YU1HQR(2) + 18×1-pt(1 each) = 26 pts ✓
//
// Non-qualifying hunters (60%):
//   Only 1-pt activators, target_pts distinct activators on target_pts distinct slots.
//   No YT1SAVA, no YU1HQR → guaranteed not to qualify.
//
// Returns [{activator, band, mode, freq}] with all entries on distinct band|mode keys.

function assignQsos(hIdx) {
  const { qualify, target } = groupOf(hIdx);
  const slotOrder = shuffle([...Array(N_SLOTS).keys()]); // random permutation of 0..19

  if (qualify) {
    // Map each activator to a distinct slot
    const actOrder = shuffle([...ACTIVATORS]); // random activator order
    return actOrder.map((act, i) => {
      const slot = SLOTS[slotOrder[i]];
      return { activator: act, band: slot.band, mode: slot.mode, freq: pick(slot.freqs) };
    });
  } else {
    // Pick target distinct 1-pt activators and target distinct slots
    const acts  = shuffle([...PT1_ACTS]).slice(0, target);
    return acts.map((act, i) => {
      const slot = SLOTS[slotOrder[i]];
      return { activator: act, band: slot.band, mode: slot.mode, freq: pick(slot.freqs) };
    });
  }
}

// ── Build per-activator pools ─────────────────────────────────────────────────
const fs2 = require('fs');
const POOLS = {};
for (const a of ACTIVATORS) POOLS[a] = [];

for (let hi = 0; hi < TOTAL_HUNTERS; hi++) {
  const hunter = HUNTERS[hi];
  for (const q of assignQsos(hi)) {
    POOLS[q.activator].push({ hunter, band: q.band, mode: q.mode, freq: q.freq });
  }
}

console.log('── Pool sizes (unique QSOs before 2 % dups) ──');
let grandUnique = 0;
for (const a of ACTIVATORS) { console.log(`  ${a}: ${POOLS[a].length}`); grandUnique += POOLS[a].length; }
console.log(`  TOTAL: ${grandUnique}\n`);

// ── File planning: split pool into 1–4 files of 1200–1600 QSOs ───────────────
function nFiles(poolSize) {
  // Target ~1400 unique per file; clamp to [1, 4]
  return Math.min(4, Math.max(1, Math.round(poolSize / 1400)));
}

// ── Cabrillo helpers ──────────────────────────────────────────────────────────
function randTime() { return new Date(START_MS + Math.floor(rng() * (END_MS - START_MS))); }
function fmtDate(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function fmtTime(d) {
  return `${String(d.getUTCHours()).padStart(2,'0')}${String(d.getUTCMinutes()).padStart(2,'0')}`;
}
function cabMode(m) { return m === 'SSB' ? 'PH' : m; }

function buildCabrillo(activator, qsos) {
  qsos.sort((a, b) => a.time - b.time);
  const lines = [
    'START-OF-LOG: 3.0',
    `CALLSIGN: ${activator}`,
    'CONTEST: SAVA-RIVER-DAYS-2026',
    'CATEGORY-OPERATOR: SINGLE-OP',
    'CATEGORY-MODE: MIXED',
    `OPERATORS: ${activator}`,
    'CREATED-BY: SAVA-TEST-GENERATOR',
    '',
  ];
  let sn = 1;
  for (const q of qsos) {
    const snStr = String(sn++).padStart(3, '0');
    const mode  = cabMode(q.mode).padEnd(4);
    const freq  = String(q.freq).padStart(7);
    lines.push(`QSO: ${freq} ${mode} ${fmtDate(q.time)} ${fmtTime(q.time)} ${activator.padEnd(13)} 59  ${snStr}  ${q.hunter.padEnd(13)} 59  001`);
  }
  lines.push('END-OF-LOG:');
  return lines.join('\r\n');
}

// ── Generate files ────────────────────────────────────────────────────────────
const OUT_DIR = path.join(__dirname, 'TestUploadFiles');
// Wipe and recreate
if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR);

console.log('── Generated files ──');
let grandTotal = 0, grandDups = 0;

for (const activator of ACTIVATORS) {
  const pool   = shuffle(POOLS[activator]);
  const nF     = nFiles(pool.length);
  const actDir = path.join(OUT_DIR, activator);
  fs.mkdirSync(actDir);

  // Split unique QSOs evenly across nF files
  const chunk = Math.ceil(pool.length / nF);
  const chunks = Array.from({ length: nF }, (_, f) => pool.slice(f * chunk, (f + 1) * chunk));

  const totalDupsForAct = Math.round(pool.length * DUP_RATE / (1 - DUP_RATE));

  for (let f = 0; f < nF; f++) {
    const unique = chunks[f];
    const withTs = unique.map(q => ({ ...q, time: randTime() }));

    const nDups = Math.round(totalDupsForAct * unique.length / pool.length);
    const dups  = Array.from({ length: nDups }, () => {
      const orig     = withTs[Math.floor(rng() * withTs.length)];
      const offsetMs = ri(1, 4) * 60_000 * (rng() > 0.5 ? 1 : -1);
      const t        = new Date(Math.max(START_MS, Math.min(END_MS, orig.time.getTime() + offsetMs)));
      return { ...orig, time: t };
    });

    const allQsos  = [...withTs, ...dups];
    const filename = `${activator}_log${f + 1}.log`;
    fs.writeFileSync(path.join(actDir, filename), buildCabrillo(activator, allQsos), 'utf8');

    grandTotal += allQsos.length;
    grandDups  += nDups;
    console.log(`  ${activator}/${filename}: ${unique.length} unique + ${nDups} dups = ${allQsos.length} QSOs`);
  }
}

const dupPct = (grandDups / grandTotal * 100).toFixed(2);

// Distribution summary
const q = GROUPS.find(g => g.qualify);
const qualCount = Math.round((q?.limit ?? 0));
const nonQual = TOTAL_HUNTERS - qualCount;

console.log(`
── Summary ──────────────────────────────────────────────────────────
  Total hunters   : ${TOTAL_HUNTERS}
  Total QSOs      : ${grandTotal.toLocaleString()}  (${grandDups.toLocaleString()} dups = ${dupPct} %)

  Hunter distribution:
    40 % (${qualCount} hunters) : qualify for diploma (26 pts, all 20 activators contacted)
    10 % (${Math.round(TOTAL_HUNTERS*0.10)} hunters) : 1 pt
    10 % (${Math.round(TOTAL_HUNTERS*0.10)} hunters) : 2 pts
    10 % (${Math.round(TOTAL_HUNTERS*0.10)} hunters) : 3 pts
    10 % (${Math.round(TOTAL_HUNTERS*0.10)} hunters) : 4 pts
     5 % (${Math.round(TOTAL_HUNTERS*0.05)} hunters) : 5 pts
     5 % (${Math.round(TOTAL_HUNTERS*0.05)} hunters) : 6 pts
     5 % (${Math.round(TOTAL_HUNTERS*0.05)} hunters) : 7 pts
     5 % (${Math.round(TOTAL_HUNTERS*0.05)} hunters) : 8 pts

  Qualifying hunter design (26 pts, 20 QSOs):
    1 × YT1SAVA (6 pts) + 1 × YU1HQR (2 pts) + 18 × 1-pt activators (18 pts)
    All contacts on 20 distinct band/mode slots → upload order does not affect scoring.

  Non-qualifying hunter design:
    Only 1-pt activators (no YT1SAVA, no YU1HQR).
    k-pt hunter contacts k distinct 1-pt activators on k distinct band/mode slots.

  Upload notes:
    • All 20 activators must be registered in the system before uploading.
    • Files are grouped by activator in TestUploadFiles/<CALLSIGN>/.
    • Use Admin → "Login as" to switch to each activator and upload their files.
─────────────────────────────────────────────────────────────────────`);
