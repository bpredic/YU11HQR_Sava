'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HunterSearch } from './HunterSearch'
import { useT } from '@/components/TranslationsProvider'
import { QsoPagination } from '@/components/QsoPagination'
import { Spinner } from '@/components/ui/spinner'

type QsoWithPoints = {
  id: number
  activatorCall: string
  frequency: number
  band: string
  mode: string
  datetime: string
  sentRst: string
  rcvdRst: string
  logFilename: string
  points: number
}

type Stats = {
  callsign: string
  qsos: QsoWithPoints[]
  totalPoints: number
  hasRequiredActivator: boolean
  qualifiesForDiploma: boolean
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

export function HunterStats({ callsign, isAdmin = false }: { callsign: string; isAdmin?: boolean }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const t = useT()

  useEffect(() => {
    fetch(`/api/hunter/${encodeURIComponent(callsign)}`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [callsign])

  async function downloadDiploma() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/hunter/${encodeURIComponent(callsign)}/diploma`)
      if (!res.ok) {
        toast.error(t.hunter.diplomaError)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Sava2026-Diploma-${callsign}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Spinner className="h-4 w-4" />{t.hunter.loading}</div>

  if (!stats) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground mb-4">{t.hunter.loadError(callsign)}</p>
      <Link href="/hunter"><Button variant="outline">{t.hunter.tryAgain}</Button></Link>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-mono">{callsign}</h1>
            {stats.qualifiesForDiploma && (
              <Badge className="bg-amber-500 text-white hover:bg-amber-500 text-sm">
                {t.hunter.diplomaEarned}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">{t.hunter.statsSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/hunter"><Button variant="outline" size="sm">{t.hunter.newSearch}</Button></Link>
          {(stats.qualifiesForDiploma || isAdmin) && (
            <Button
              onClick={downloadDiploma}
              disabled={downloading}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {downloading ? t.hunter.generating : t.hunter.downloadDiploma}
            </Button>
          )}
        </div>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-[oklch(0.25_0.09_232)] text-white p-4 text-center">
          <div className="text-3xl font-bold">{stats.totalPoints}</div>
          <div className="text-xs opacity-80">{t.hunter.totalPoints}</div>
        </div>
        <div className="rounded-lg bg-muted p-4 text-center">
          <div className="text-3xl font-bold">{stats.qsos.filter(q => q.points > 0).length}</div>
          <div className="text-xs text-muted-foreground">{t.hunter.scoringQsos}</div>
        </div>
        <div className={`rounded-lg p-4 text-center ${stats.hasRequiredActivator ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
          <div className={`text-2xl font-bold ${stats.hasRequiredActivator ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
            {stats.hasRequiredActivator ? '✓' : '✗'}
          </div>
          <div className="text-xs text-muted-foreground">{t.hunter.yt1savaQso}</div>
        </div>
        <div className={`rounded-lg p-4 text-center ${stats.qualifiesForDiploma ? 'bg-amber-50 dark:bg-amber-950' : 'bg-muted'}`}>
          <div className={`text-2xl font-bold ${stats.qualifiesForDiploma ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {stats.totalPoints}/10
          </div>
          <div className="text-xs text-muted-foreground">{t.hunter.diplomaThreshold}</div>
        </div>
      </div>

      {/* Status message */}
      {!stats.qualifiesForDiploma && (
        <div className="rounded-lg border border-muted bg-muted/50 p-4 text-sm">
          {stats.qsos.length === 0
            ? t.hunter.noQsos
            : !stats.hasRequiredActivator
              ? t.hunter.needYt1sava(stats.totalPoints)
              : t.hunter.needMorePoints(10 - stats.totalPoints)
          }
        </div>
      )}

      {/* Search another callsign */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground whitespace-nowrap">{t.hunter.searchAnother}</p>
            <HunterSearch />
          </div>
        </CardContent>
      </Card>

      {/* QSO table */}
      {stats.qsos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.hunter.qsosFound}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table containerClassName="max-h-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t.hunter.colActivator}</TableHead>
                  <TableHead>{t.hunter.colBand}</TableHead>
                  <TableHead>{t.hunter.colMode}</TableHead>
                  <TableHead>{t.hunter.colFreq}</TableHead>
                  <TableHead>{t.hunter.colDateTime}</TableHead>
                  <TableHead className="text-right">{t.hunter.colPoints}</TableHead>
                  <TableHead>{t.hunter.colLogFile}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.qsos.slice((page - 1) * pageSize, page * pageSize).map(q => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <span className="font-mono font-semibold">{q.activatorCall}</span>
                      {q.activatorCall === 'YT1SAVA' && (
                        <Badge className="ml-2 bg-amber-500 text-white hover:bg-amber-500 text-xs">6pts</Badge>
                      )}
                      {q.activatorCall === 'YU1HQR' && (
                        <Badge className="ml-2 bg-sky-600 text-white hover:bg-sky-600 text-xs">2pts</Badge>
                      )}
                    </TableCell>
                    <TableCell>{q.band}</TableCell>
                    <TableCell>{q.mode}</TableCell>
                    <TableCell className="font-mono">{q.frequency}</TableCell>
                    <TableCell className="text-sm">{fmt(q.datetime)}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={q.points > 0 ? 'default' : 'secondary'}
                        className={q.points > 0 ? 'bg-green-600 hover:bg-green-600 text-white' : ''}
                      >
                        {q.points > 0 ? `+${q.points}` : '0 (dupe)'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{q.logFilename}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <QsoPagination
              total={stats.qsos.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
