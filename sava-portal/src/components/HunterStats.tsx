'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HunterSearch } from './HunterSearch'

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

export function HunterStats({ callsign }: { callsign: string }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

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
        toast.error('Could not generate diploma')
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

  if (loading) return <p className="text-muted-foreground">Loading…</p>

  if (!stats) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground mb-4">Could not load stats for {callsign}</p>
      <Link href="/hunter"><Button variant="outline">Try again</Button></Link>
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
              <Badge className="bg-amber-500 text-white hover:bg-amber-500 text-sm">DIPLOMA EARNED!</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">Hunter Statistics – Sava River Days 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/hunter"><Button variant="outline" size="sm">← New Search</Button></Link>
          {stats.qualifiesForDiploma && (
            <Button
              onClick={downloadDiploma}
              disabled={downloading}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {downloading ? 'Generating…' : '⬇ Download Diploma (PDF)'}
            </Button>
          )}
        </div>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-[oklch(0.25_0.09_232)] text-white p-4 text-center">
          <div className="text-3xl font-bold">{stats.totalPoints}</div>
          <div className="text-xs opacity-80">Total Points</div>
        </div>
        <div className="rounded-lg bg-muted p-4 text-center">
          <div className="text-3xl font-bold">{stats.qsos.filter(q => q.points > 0).length}</div>
          <div className="text-xs text-muted-foreground">Scoring QSOs</div>
        </div>
        <div className={`rounded-lg p-4 text-center ${stats.hasRequiredActivator ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
          <div className={`text-2xl font-bold ${stats.hasRequiredActivator ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
            {stats.hasRequiredActivator ? '✓' : '✗'}
          </div>
          <div className="text-xs text-muted-foreground">YT1SAVA QSO</div>
        </div>
        <div className={`rounded-lg p-4 text-center ${stats.qualifiesForDiploma ? 'bg-amber-50 dark:bg-amber-950' : 'bg-muted'}`}>
          <div className={`text-2xl font-bold ${stats.qualifiesForDiploma ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {stats.totalPoints}/10
          </div>
          <div className="text-xs text-muted-foreground">Diploma Threshold</div>
        </div>
      </div>

      {/* Status message */}
      {!stats.qualifiesForDiploma && (
        <div className="rounded-lg border border-muted bg-muted/50 p-4 text-sm">
          {stats.qsos.length === 0
            ? 'No QSOs found in the contest log database for this callsign.'
            : !stats.hasRequiredActivator
              ? `You need at least one QSO with YT1SAVA (mandatory for diploma). Current points: ${stats.totalPoints}.`
              : `You need ${10 - stats.totalPoints} more point${10 - stats.totalPoints !== 1 ? 's' : ''} to earn the diploma.`
          }
        </div>
      )}

      {/* Search another callsign */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground whitespace-nowrap">Search another:</p>
            <HunterSearch />
          </div>
        </CardContent>
      </Card>

      {/* QSO table */}
      {stats.qsos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">QSOs Found in Contest Logs</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activator</TableHead>
                  <TableHead>Band</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Freq (kHz)</TableHead>
                  <TableHead>Date/Time (UTC)</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead>Log File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.qsos.map(q => (
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
