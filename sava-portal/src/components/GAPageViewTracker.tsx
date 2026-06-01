'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export function GAPageViewTracker({ gaId }: { gaId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    if (typeof w.gtag === 'function') {
      w.gtag('event', 'page_view', {
        page_location: window.location.href,
        page_title: document.title,
        send_to: gaId,
      })
    }
  }, [pathname, searchParams, gaId])

  return null
}
