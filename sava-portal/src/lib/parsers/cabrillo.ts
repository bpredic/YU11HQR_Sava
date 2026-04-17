import { bandFromFrequency, normalizeMode } from '@/lib/scoring'

export type ParsedQso = {
  activatorCall: string
  hunterCall: string
  frequency: number
  band: string
  mode: string
  datetime: Date
  sentRst: string
  rcvdRst: string
  sentExch: string
  rcvdExch: string
}

export type ParseResult = {
  qsos: ParsedQso[]
  errors: string[]
}

/**
 * Parses a Cabrillo 3.0 log file.
 * QSO line format:
 * QSO: <freq> <mode> <date> <time> <sent-call> <sent-rst> <sent-exch> <rcvd-call> <rcvd-rst> <rcvd-exch>
 */
export function parseCabrillo(content: string): ParseResult {
  const lines = content.split(/\r?\n/)
  const qsos: ParsedQso[] = []
  const errors: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line.startsWith('QSO:')) continue

    // Remove "QSO:" prefix and split on whitespace
    const parts = line.slice(4).trim().split(/\s+/)

    // Minimum fields: freq mode date time sentCall sentRst sentExch rcvdCall rcvdRst rcvdExch
    if (parts.length < 10) {
      errors.push(`Malformed QSO line (too few fields): ${line}`)
      continue
    }

    const [freq, mode, date, time, sentCall, sentRst, sentExch, rcvdCall, rcvdRst, rcvdExch] = parts
    const freqKhz = parseInt(freq, 10)

    if (isNaN(freqKhz)) {
      errors.push(`Invalid frequency in QSO: ${line}`)
      continue
    }

    // Parse datetime: date is YYYY-MM-DD, time is HHMM
    const datetimeStr = `${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00Z`
    const datetime = new Date(datetimeStr)

    if (isNaN(datetime.getTime())) {
      errors.push(`Invalid date/time in QSO: ${line}`)
      continue
    }

    qsos.push({
      activatorCall: sentCall.toUpperCase(),
      hunterCall: rcvdCall.toUpperCase(),
      frequency: freqKhz,
      band: bandFromFrequency(freqKhz),
      mode: normalizeMode(mode),
      datetime,
      sentRst,
      rcvdRst,
      sentExch: sentExch ?? '',
      rcvdExch: rcvdExch ?? '',
    })
  }

  return { qsos, errors }
}
