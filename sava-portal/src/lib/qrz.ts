const QRZ_BASE = 'https://xmldata.qrz.com/xml/current/'

export type QrzInfo = {
  callsign: string
  firstName: string | null
  lastName: string | null
  nameFmt: string | null   // formatted name incl. nickname, e.g. 'Bratislav "Buca" Predić'
  addr1: string | null     // street address
  city: string | null      // addr2 in QRZ (city)
  zip: string | null
  country: string | null
}

function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return m ? m[1].trim() || null : null
}

// In-process session cache (survives across requests within the same process lifetime)
let cachedSession: { key: string; expiresAt: number } | null = null

async function getSessionKey(): Promise<string | null> {
  if (cachedSession && Date.now() < cachedSession.expiresAt) {
    return cachedSession.key
  }

  const username = process.env.QRZ_USERNAME
  const password = process.env.QRZ_PASSWORD
  if (!username || !password) return null

  let xml: string
  try {
    const res = await fetch(
      `${QRZ_BASE}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&agent=SavaPortal`,
      { cache: 'no-store' }
    )
    if (!res.ok) return null
    xml = await res.text()
  } catch {
    return null
  }

  const key = extractTag(xml, 'Key')
  if (!key) return null

  // QRZ sessions last 24 h; refresh after 23 h to be safe
  cachedSession = { key, expiresAt: Date.now() + 23 * 60 * 60 * 1000 }
  return key
}

export async function lookupCallsign(callsign: string): Promise<QrzInfo | null> {
  const sessionKey = await getSessionKey()
  if (!sessionKey) return null

  let xml: string
  try {
    const res = await fetch(
      `${QRZ_BASE}?s=${encodeURIComponent(sessionKey)}&callsign=${encodeURIComponent(callsign)}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    xml = await res.text()
  } catch {
    return null
  }

  // Session may have expired mid-flight; clear cache and let caller retry next request
  if (xml.includes('<Error>Invalid session key') || xml.includes('<Error>Session Timeout')) {
    cachedSession = null
    return null
  }

  if (!xml.includes('<Callsign>')) return null

  return {
    callsign: extractTag(xml, 'call') ?? callsign,
    firstName: extractTag(xml, 'fname'),
    lastName: extractTag(xml, 'name'),
    nameFmt: extractTag(xml, 'name_fmt'),
    addr1: extractTag(xml, 'addr1'),
    city: extractTag(xml, 'addr2'),
    zip: extractTag(xml, 'zip'),
    country: extractTag(xml, 'country'),
  }
}
