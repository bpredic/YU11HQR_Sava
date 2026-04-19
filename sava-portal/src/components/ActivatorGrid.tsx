'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

type ActivityInfo = {
  isActive: boolean
  band: string
  frequency: number
  mode: string
  startAt: string
  endAt: string
}

type Activator = { call: string; points: number }
type ActivityEntry = { call: string; info: ActivityInfo }

type T = {
  pt: string
  pts: string
  activeNow: string
  activeUntil: string
  nextActivation: string
}

function fmtUtc(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
}

export function ActivatorGrid({
  activators,
  activity,
  t,
}: {
  activators: Activator[]
  activity: ActivityEntry[]
  t: T
}) {
  const activityMap = new Map(activity.map(({ call, info }) => [call, info]))

  const [openCall, setOpenCall] = useState<string | null>(null)
  const [isTouchDevice] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches,
  )
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on scroll or outside click when a tooltip is open (mobile)
  useEffect(() => {
    if (!openCall) return

    const close = () => setOpenCall(null)

    window.addEventListener('scroll', close, { passive: true })
    document.addEventListener('touchstart', handleOutside, { passive: true })
    document.addEventListener('mousedown', handleOutside)

    function handleOutside(e: Event) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }

    return () => {
      window.removeEventListener('scroll', close)
      document.removeEventListener('touchstart', handleOutside as EventListener)
      document.removeEventListener('mousedown', handleOutside as EventListener)
    }
  }, [openCall])

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-w-4xl mx-auto"
    >
      {activators.map(({ call, points }) => {
        const info = activityMap.get(call)
        const isActive = info?.isActive === true
        const isOpen = openCall === call

        return (
          <div
            key={call}
            className="relative group/card"
            onClick={() => {
              if (isTouchDevice && info) {
                setOpenCall(prev => (prev === call ? null : call))
              }
            }}
          >
            <div
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg border bg-card',
                isActive &&
                  'border-2 border-green-500 bg-green-50/70 dark:bg-green-950/40 shadow-[0_0_16px_rgba(34,197,94,0.45)]',
                isTouchDevice && info && 'cursor-pointer select-none',
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {isActive && (
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                )}
                <span className="font-mono font-medium text-sm truncate">{call}</span>
              </div>
              <Badge
                className={
                  points === 6
                    ? 'bg-amber-500 text-white hover:bg-amber-500 shrink-0'
                    : points === 2
                      ? 'bg-sky-600 text-white hover:bg-sky-600 shrink-0'
                      : 'shrink-0'
                }
                variant={points === 1 ? 'secondary' : 'default'}
              >
                {points} {points === 1 ? t.pt : t.pts}
              </Badge>
            </div>

            {info && (
              <div
                className={cn(
                  'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 transition-opacity duration-150 pointer-events-none z-50',
                  isTouchDevice
                    ? isOpen
                      ? 'opacity-100'
                      : 'opacity-0'
                    : 'opacity-0 group-hover/card:opacity-100',
                )}
              >
                <div className="bg-popover text-popover-foreground rounded-lg shadow-lg ring-1 ring-foreground/10 p-3 text-xs space-y-1.5">
                  {isActive ? (
                    <>
                      <div className="flex items-center gap-1.5 font-semibold text-green-600 dark:text-green-400">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        {t.activeNow}
                      </div>
                      <div className="font-mono text-foreground">
                        {info.band} · {info.frequency} kHz · {info.mode}
                      </div>
                      <div className="text-muted-foreground">
                        {t.activeUntil}: {fmtUtc(info.endAt)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold text-muted-foreground">{t.nextActivation}:</div>
                      <div className="font-mono text-foreground">
                        {info.band} · {info.frequency} kHz · {info.mode}
                      </div>
                      <div className="text-muted-foreground">{fmtUtc(info.startAt)}</div>
                      <div className="text-muted-foreground">→ {fmtUtc(info.endAt)}</div>
                    </>
                  )}
                </div>
                <div className="flex justify-center -mt-px">
                  <div className="w-3 h-3 bg-popover ring-1 ring-foreground/10 rotate-45 shadow-sm" />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
