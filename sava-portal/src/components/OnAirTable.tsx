'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useT } from '@/components/TranslationsProvider'

type Period = {
  id: number
  callsign: string
  band: string
  mode: string
  frequency: number
  startAt: string
  endAt: string
}

function fmtUtc(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
}

export function OnAirTable() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<keyof Omit<Period, 'id'>>('startAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const t = useT()

  function handleSort(key: keyof Omit<Period, 'id'>) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedPeriods = useMemo(() => {
    return [...periods].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [periods, sortKey, sortDir])

  const fetchData = useCallback(() => {
    fetch('/api/on-air')
      .then(r => r.json())
      .then(data => { setPeriods(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
        <Spinner className="h-4 w-4" />{t.onAir.loading}
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="pt-4">
        {periods.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {t.onAir.activeCount(periods.length)}
          </p>
        )}

        {periods.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">{t.onAir.noneActive}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {(
                  [
                    { key: 'callsign', label: t.onAir.colCallsign },
                    { key: 'band', label: t.onAir.colBand },
                    { key: 'mode', label: t.onAir.colMode },
                    { key: 'frequency', label: t.onAir.colFreq },
                    { key: 'startAt', label: t.onAir.colStart },
                    { key: 'endAt', label: t.onAir.colEnd },
                  ] as { key: keyof Omit<Period, 'id'>; label: string }[]
                ).map(col => (
                  <TableHead key={col.key}>
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 hover:text-foreground transition-colors select-none"
                    >
                      {col.label}
                      <span className="text-xs text-muted-foreground">
                        {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPeriods.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                      <Link href={`/hunter/${p.callsign}`} className="font-mono font-semibold hover:underline">
                        {p.callsign}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.band}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{p.mode}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">{p.frequency}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtUtc(p.startAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtUtc(p.endAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
