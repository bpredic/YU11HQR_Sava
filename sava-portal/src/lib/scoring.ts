// Contest period: June 1-7, 2026
export const CONTEST_START = new Date('2026-06-01T00:00:00Z')
export const CONTEST_END = new Date('2026-06-07T23:59:59Z')

// Minimum points required for diploma
export const MIN_POINTS_FOR_DIPLOMA = 10

// Special activator required for diploma
export const REQUIRED_ACTIVATOR = 'YT1SAVA'

// All eligible activators
export const ACTIVATORS = [
  'YT1SAVA', 'YU1HQR', 'YU1FI', 'YU1XO', 'YT1TU',
  'YU4LUM', 'YU4URM', 'YU4CFA', 'YU4NPV', 'YU4RDX',
  'YU4BCP', 'YU5TM', 'YU5DR', 'YT5FDE', 'YT5TNM',
  'YT5WA', 'YT5MM', 'YU6DEJ', 'YU6DMR', 'YT1T',
]

// Point values per activator callsign
export const POINT_VALUES: Record<string, number> = {
  YT1SAVA: 6,
  YU1HQR: 2,
}

export function getPointsForActivator(callsign: string): number {
  return POINT_VALUES[callsign.toUpperCase()] ?? 1
}

// Allowed modes
export const ALLOWED_MODES = ['CW', 'SSB', 'FT8', 'FT4', 'FT2', 'FM']

// Normalize mode from Cabrillo/ADIF to contest mode
export function normalizeMode(raw: string): string {
  const upper = raw.toUpperCase()
  if (upper === 'PH' || upper === 'SSB' || upper === 'USB' || upper === 'LSB') return 'SSB'
  if (upper === 'CW') return 'CW'
  if (upper === 'FT8') return 'FT8'
  if (upper === 'FT4') return 'FT4'
  if (upper === 'FT2') return 'FT2'
  if (upper === 'FM') return 'FM'
  if (upper === 'RY' || upper === 'RTTY') return 'RTTY'
  return upper
}

// Derive band from frequency in kHz
export function bandFromFrequency(freqKhz: number): string {
  if (freqKhz >= 1800 && freqKhz <= 2000) return '160M'
  if (freqKhz >= 3500 && freqKhz <= 4000) return '80M'
  if (freqKhz >= 7000 && freqKhz <= 7300) return '40M'
  if (freqKhz >= 10100 && freqKhz <= 10150) return '30M'
  if (freqKhz >= 14000 && freqKhz <= 14350) return '20M'
  if (freqKhz >= 18068 && freqKhz <= 18168) return '17M'
  if (freqKhz >= 21000 && freqKhz <= 21450) return '15M'
  if (freqKhz >= 24890 && freqKhz <= 24990) return '12M'
  if (freqKhz >= 28000 && freqKhz <= 29700) return '10M'
  if (freqKhz >= 50000 && freqKhz <= 54000) return '6M'
  if (freqKhz >= 144000 && freqKhz <= 148000) return '2M'
  if (freqKhz >= 430000 && freqKhz <= 440000) return '70CM'
  return `${freqKhz}KHZ`
}

export type HunterQso = {
  id: number
  activatorCall: string
  frequency: number
  band: string
  mode: string
  datetime: Date
  sentRst: string
  rcvdRst: string
  logFileId: number
  logFilename: string
}

export type HunterStats = {
  callsign: string
  qsos: (HunterQso & { points: number })[]
  totalPoints: number
  hasRequiredActivator: boolean
  qualifiesForDiploma: boolean
}

export function calculateHunterStats(callsign: string, qsos: HunterQso[]): HunterStats {
  // One QSO per band+mode combination — first uploaded activator for that slot scores
  const seen = new Set<string>()
  const scoredQsos: (HunterQso & { points: number })[] = []
  let totalPoints = 0
  let hasRequiredActivator = false

  for (const qso of qsos) {
    const key = `${qso.band}|${qso.mode}`
    const isDup = seen.has(key)
    const points = isDup ? 0 : getPointsForActivator(qso.activatorCall)

    if (!isDup) {
      seen.add(key)
      totalPoints += points
      if (qso.activatorCall.toUpperCase() === REQUIRED_ACTIVATOR) {
        hasRequiredActivator = true
      }
    }

    scoredQsos.push({ ...qso, points })
  }

  return {
    callsign,
    qsos: scoredQsos,
    totalPoints,
    hasRequiredActivator,
    qualifiesForDiploma: totalPoints >= MIN_POINTS_FOR_DIPLOMA && hasRequiredActivator,
  }
}
