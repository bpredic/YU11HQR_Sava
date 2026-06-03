'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useT } from '@/components/TranslationsProvider'

type DxSpot = {
  spotter: string
  freq: number
  dx: string
  comment: string
  mode: string
  time: string
  receivedAt: string
  isActivator: boolean
}

const MAX_SPOTS = 200
const TWO_HOURS_MS = 2 * 60 * 60 * 1000

export function DxSpotsWidget() {
  const t = useT()
  const [allSpots, setAllSpots] = useState<DxSpot[]>([])
  const [activatorsOnly, setActivatorsOnly] = useState(true)
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/spots')
    esRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const spot: DxSpot = JSON.parse(e.data)
        setAllSpots(prev => [spot, ...prev].slice(0, MAX_SPOTS))
      } catch {
        // ignore malformed event
      }
    }

    // Purge spots older than 2 h even when no new spots arrive
    const purge = setInterval(() => {
      const cutoff = Date.now() - TWO_HOURS_MS
      setAllSpots(prev => prev.filter(s => new Date(s.receivedAt).getTime() > cutoff))
    }, 60_000)

    return () => {
      es.close()
      setConnected(false)
      clearInterval(purge)
    }
  }, [])

  const cutoff = Date.now() - TWO_HOURS_MS
  const visible = (activatorsOnly ? allSpots.filter(s => s.isActivator) : allSpots)
    .filter(s => new Date(s.receivedAt).getTime() > cutoff)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                connected ? 'bg-green-500 animate-pulse' : 'bg-red-400'
              }`}
            />
            {t.spots.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              id="activators-only"
              checked={activatorsOnly}
              onCheckedChange={setActivatorsOnly}
            />
            <Label htmlFor="activators-only" className="text-sm cursor-pointer select-none">
              {activatorsOnly ? t.spots.filterActivators : t.spots.filterAll}
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            {connected ? t.spots.waiting : t.spots.connecting}
          </p>
        ) : (
          <div className="overflow-y-auto max-h-80 divide-y divide-border/40">
            {visible.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm font-mono py-1.5">
                <span className="text-muted-foreground w-[3.5rem] shrink-0 tabular-nums">{s.time}</span>
                <Link
                  href={`/hunter/${s.dx}`}
                  className={`font-semibold w-20 shrink-0 hover:underline ${
                    s.isActivator ? 'text-primary' : ''
                  }`}
                >
                  {s.dx}
                </Link>
                <Badge variant="secondary" className="text-xs tabular-nums shrink-0">
                  {s.freq.toFixed(1)}
                </Badge>
                {s.mode && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {s.mode}
                  </Badge>
                )}
                <span className="text-muted-foreground truncate flex-1 text-xs">{s.comment}</span>
                <span className="text-xs text-muted-foreground shrink-0">de {s.spotter}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
