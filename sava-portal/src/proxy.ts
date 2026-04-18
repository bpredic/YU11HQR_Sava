import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SR_COUNTRIES = new Set(['RS', 'HR', 'BA', 'ME', 'SI', 'MK'])

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next()

  if (request.cookies.has('locale')) return response

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    null

  let locale = 'sr'

  if (ip && ip !== '127.0.0.1' && ip !== '::1' && ip !== '::ffff:127.0.0.1') {
    try {
      const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
        signal: AbortSignal.timeout(2000),
      })
      const data = await res.json() as { countryCode?: string }
      if (data.countryCode && !SR_COUNTRIES.has(data.countryCode)) {
        locale = 'en'
      }
    } catch {
      // keep 'sr' on timeout or network error
    }
  }

  response.cookies.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: 'lax',
  })

  return response
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico).*)',
  ],
}
