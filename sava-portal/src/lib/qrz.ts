const QRZ_BASE = 'https://xmldata.qrz.com/xml/current/'

export type QrzInfo = {
  callsign: string
  firstName: string | null
  lastName: string | null
  country: string | null
  city: string | null
}

function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return m ? m[1].trim() || null : null
}

export async function lookupCallsign(callsign: string): Promise<QrzInfo | null> {
  const apiKey = process.env.QRZ_API_KEY
  if (!apiKey) return null

  let xml: string
  try {
    const res = await fetch(
      `${QRZ_BASE}?s=${encodeURIComponent(apiKey)}&callsign=${encodeURIComponent(callsign)}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    xml = await res.text()
  } catch {
    return null
  }

  if (xml.includes('<Error>') || !xml.includes('<Callsign>')) return null

  return {
    callsign: extractTag(xml, 'call') ?? callsign,
    firstName: extractTag(xml, 'fname'),
    lastName: extractTag(xml, 'name'),
    country: extractTag(xml, 'country'),
    city: extractTag(xml, 'addr2'),
  }
}
