import { bandFromFrequency, normalizeMode } from '@/lib/scoring'
import type { ParseResult, ParsedQso } from './cabrillo'

/**
 * Parses an ADIF log file.
 * Fields are encoded as <FIELDNAME:LENGTH>value
 * Records are terminated with <EOR>
 */
export function parseAdif(content: string): ParseResult {
  const qsos: ParsedQso[] = []
  const errors: string[] = []

  // Split records at <EOR> (case-insensitive)
  const records = content.split(/<EOR>/i)

  for (const record of records) {
    const trimmed = record.trim()
    if (!trimmed || trimmed.toUpperCase().startsWith('<EOH>') || trimmed.length < 5) continue

    const fields: Record<string, string> = {}

    // Extract all <FIELD:LENGTH>value pairs
    const fieldRegex = /<([A-Z_]+):(\d+)(?::[^>]*)?>([^<]*)/gi
    let match: RegExpExecArray | null

    while ((match = fieldRegex.exec(trimmed)) !== null) {
      const name = match[1].toUpperCase()
      const length = parseInt(match[2], 10)
      const value = match[3].slice(0, length)
      fields[name] = value
    }

    const call = fields['CALL']
    const myCall = fields['STATION_CALLSIGN'] ?? fields['MY_CALLSIGN'] ?? ''
    const qsoDate = fields['QSO_DATE']
    const timeOn = fields['TIME_ON']
    const band = fields['BAND']
    const freq = fields['FREQ'] // in MHz
    const mode = fields['MODE']
    const rstSent = fields['RST_SENT'] ?? '59'
    const rstRcvd = fields['RST_RCVD'] ?? '59'

    if (!call || !qsoDate || !timeOn || (!band && !freq)) {
      if (call || qsoDate) {
        errors.push(`Incomplete ADIF record for CALL=${call ?? '?'} DATE=${qsoDate ?? '?'}`)
      }
      continue
    }

    // Parse datetime
    const year = qsoDate.slice(0, 4)
    const month = qsoDate.slice(4, 6)
    const day = qsoDate.slice(6, 8)
    const hour = timeOn.slice(0, 2)
    const minute = timeOn.slice(2, 4)
    const second = timeOn.slice(4, 6) || '00'
    const datetime = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`)

    if (isNaN(datetime.getTime())) {
      errors.push(`Invalid date/time in ADIF record for CALL=${call}`)
      continue
    }

    // Determine frequency and band
    let freqKhz = 0
    let resolvedBand = band ?? ''

    if (freq) {
      freqKhz = Math.round(parseFloat(freq) * 1000)
      if (!resolvedBand) resolvedBand = bandFromFrequency(freqKhz)
    } else if (band) {
      // Approximate mid-band frequency for common bands
      const bandMap: Record<string, number> = {
        '160M': 1900, '80M': 3700, '40M': 7100, '30M': 10125,
        '20M': 14200, '17M': 18100, '15M': 21200, '12M': 24940,
        '10M': 28500, '6M': 51000, '2M': 145000, '70CM': 433000,
      }
      freqKhz = bandMap[band.toUpperCase()] ?? 0
      resolvedBand = band.toUpperCase()
    }

    qsos.push({
      activatorCall: myCall.toUpperCase() || 'UNKNOWN',
      hunterCall: call.toUpperCase(),
      frequency: freqKhz,
      band: resolvedBand.toUpperCase(),
      mode: normalizeMode(mode ?? 'SSB'),
      datetime,
      sentRst: rstSent,
      rcvdRst: rstRcvd,
      sentExch: '',
      rcvdExch: '',
    })
  }

  return { qsos, errors }
}
