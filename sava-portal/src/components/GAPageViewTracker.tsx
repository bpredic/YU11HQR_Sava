'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

declare const gtag: (command: string, action: string, params: Record<string, string>) => void

export function GAPageViewTracker({ gaId }: { gaId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams}` : '')
    if (typeof gtag !== 'undefined') {
      gtag('config', gaId, { page_path: url })
    }
  }, [pathname, searchParams, gaId])

  return null
}
