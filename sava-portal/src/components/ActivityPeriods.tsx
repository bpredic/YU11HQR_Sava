'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useT } from '@/components/TranslationsProvider'
import { Spinner } from '@/components/ui/spinner'

const BANDS = ['160M','80M','40M','30M','20M','17M','15M','12M','10M','6M','2M','70CM']
const MODES = ['SSB','CW','FT8','FT4','FT2','FM']

const BAND_DEFAULT_FREQ: Record<string, number> = {
  '160M': 1850, '80M': 3700, '40M': 7100, '30M': 10125,
  '20M': 14200, '17M': 18100, '15M': 21200, '12M': 24940,
  '10M': 28500, '6M': 51000, '2M': 145500, '70CM': 433500,
}

type Period = {
  id: number
  startAt: string
  endAt: string
  band: string
  frequency: number
  mode: string
}

function fmtUtc(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC',
  }) + ' UTC'
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

export function ActivityPeriods() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [band, setBand] = useState('40M')
  const [frequency, setFrequency] = useState(String(BAND_DEFAULT_FREQ['40M']))
  const [mode, setMode] = useState('SSB')

  const t = useT()

  const fetchPeriods = useCallback(async () => {
    try {
      const res = await fetch('/api/activator/activity-periods')
      if (!res.ok) throw new Error()
      setPeriods(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPeriods() }, [fetchPeriods])

  function handleBandChange(b: string) {
    setBand(b)
    setFrequency(String(BAND_DEFAULT_FREQ[b] ?? ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (!startAt || !endAt) {
      setFormError(t.activity.errorRequired)
      return
    }

    // Treat datetime-local values as UTC
    const start = new Date(startAt + ':00Z')
    const end = new Date(endAt + ':00Z')

    if (start >= end) {
      setFormError(t.activity.errorStartEnd)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/activator/activity-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startAt: start.toISOString(), endAt: end.toISOString(), band, frequency: Number(frequency), mode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error === 'overlap' ? t.activity.errorOverlap : (data.error ?? t.activity.errorRequired))
        return
      }
      toast.success(t.activity.savedOk)
      setStartAt('')
      setEndAt('')
      fetchPeriods()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(p: Period) {
    if (!confirm(t.activity.deleteConfirm(p.band, p.mode))) return
    const res = await fetch(`/api/activator/activity-periods/${p.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(t.activity.deletedOk)
      fetchPeriods()
    }
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.activity.addPeriod}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="startAt">{t.activity.startAt}</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={startAt}
                  onChange={e => setStartAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endAt">{t.activity.endAt}</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={endAt}
                  onChange={e => setEndAt(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>{t.activity.band}</Label>
                <select
                  value={band}
                  onChange={e => handleBandChange(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {BANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="freq">{t.activity.frequency}</Label>
                <Input
                  id="freq"
                  type="number"
                  min={1}
                  value={frequency}
                  onChange={e => setFrequency(e.target.value)}
                  className="font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>{t.activity.mode}</Label>
                <select
                  value={mode}
                  onChange={e => setMode(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner className="mr-2 h-4 w-4" />}
              {submitting ? t.activity.saving : t.activity.save}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.activity.pageTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Spinner className="h-4 w-4" />{t.activity.saving}</div>
          ) : periods.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t.activity.noPeriods}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.activity.colStart}</TableHead>
                  <TableHead>{t.activity.colEnd}</TableHead>
                  <TableHead>{t.activity.colBand}</TableHead>
                  <TableHead>{t.activity.colFreq}</TableHead>
                  <TableHead>{t.activity.colMode}</TableHead>
                  <TableHead className="text-right">{t.activity.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-mono">{fmtUtc(p.startAt)}</TableCell>
                    <TableCell className="text-sm font-mono">{fmtUtc(p.endAt)}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-mono">{p.band}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{p.frequency}</TableCell>
                    <TableCell><Badge variant="outline">{p.mode}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(p)}>
                        {t.activity.delete}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
