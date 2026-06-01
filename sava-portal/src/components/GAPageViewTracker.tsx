'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

export function GAPageViewTracker({ gaId }: { gaId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isMounted = useRef(false)

  useEffect(() => {
    // Skip the initial render — GoogleAnalytics script handles the first page_view
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    const url = pathname + (searchParams.toString() ? `?${searchParams}` : '')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    if (typeof w.gtag === 'function') {
      w.gtag('config', gaId, { page_path: url, page_title: document.title })
    }
  }, [pathname, searchParams, gaId])

  return null
}
