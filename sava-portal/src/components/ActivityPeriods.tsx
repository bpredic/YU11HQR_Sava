'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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

const SPECIAL_CALLSIGNS = ['YU1HQR', 'YT1SAVA']

type Period = {
  id: number
  callsign: string
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

const SELECT_CLS = 'h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

export function ActivityPeriods({ activatorCallsign }: { activatorCallsign: string }) {
  const callsignOptions = [activatorCallsign, ...SPECIAL_CALLSIGNS.filter(c => c !== activatorCallsign)]

  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Add form state
  const [callsign, setCallsign] = useState(activatorCallsign)
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [band, setBand] = useState('40M')
  const [frequency, setFrequency] = useState(String(BAND_DEFAULT_FREQ['40M']))
  const [mode, setMode] = useState('SSB')
  const [repeatDaily, setRepeatDaily] = useState(false)
  const [repeatCount, setRepeatCount] = useState('2')

  // Edit state
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null)
  const [editCallsign, setEditCallsign] = useState(activatorCallsign)
  const [editStartAt, setEditStartAt] = useState('')
  const [editEndAt, setEditEndAt] = useState('')
  const [editBand, setEditBand] = useState('40M')
  const [editFrequency, setEditFrequency] = useState(String(BAND_DEFAULT_FREQ['40M']))
  const [editMode, setEditMode] = useState('SSB')
  const [editError, setEditError] = useState('')
  const [updating, setUpdating] = useState(false)

  const [sortKey, setSortKey] = useState<keyof Period>('startAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const t = useT()

  function handleSort(key: keyof Period) {
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
        : String(av ?? '').localeCompare(String(bv ?? ''), undefined, { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [periods, sortKey, sortDir])

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

  function handleEditBandChange(b: string) {
    setEditBand(b)
    setEditFrequency(String(BAND_DEFAULT_FREQ[b] ?? ''))
  }

  function handleEditStart(p: Period) {
    setEditingPeriod(p)
    setEditCallsign(p.callsign)
    setEditStartAt(toDatetimeLocal(p.startAt))
    setEditEndAt(toDatetimeLocal(p.endAt))
    setEditBand(p.band)
    setEditFrequency(String(p.frequency))
    setEditMode(p.mode)
    setEditError('')
  }

  function handleCancelEdit() {
    setEditingPeriod(null)
    setEditError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (!startAt || !endAt) {
      setFormError(t.activity.errorRequired)
      return
    }

    const start = new Date(startAt + ':00Z')
    const end = new Date(endAt + ':00Z')

    if (start >= end) {
      setFormError(t.activity.errorStartEnd)
      return
    }

    setSubmitting(true)
    try {
      const days = repeatDaily ? Math.max(1, Math.min(30, parseInt(repeatCount, 10) || 1)) : 1
      let saved = 0
      let skipped = 0
      let lastError = ''

      for (let i = 0; i < days; i++) {
        const s = new Date(start.getTime() + i * 86400000)
        const e = new Date(end.getTime() + i * 86400000)
        const res = await fetch('/api/activator/activity-periods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callsign, startAt: s.toISOString(), endAt: e.toISOString(), band, frequency: Number(frequency), mode }),
        })
        const data = await res.json()
        if (res.ok) {
          saved++
        } else if (data.error === 'overlap') {
          skipped++
        } else {
          lastError = data.error ?? t.activity.errorRequired
          break
        }
      }

      if (lastError) {
        setFormError(lastError)
        return
      }

      if (days === 1) {
        if (saved === 1) toast.success(t.activity.savedOk)
        else setFormError(t.activity.errorOverlap)
      } else if (skipped === 0) {
        toast.success(t.activity.repeatSavedAll(saved))
      } else if (saved > 0) {
        toast.success(t.activity.repeatSavedPartial(saved, skipped))
      } else {
        setFormError(t.activity.errorOverlap)
        return
      }

      setStartAt('')
      setEndAt('')
      setRepeatDaily(false)
      setRepeatCount('2')
      fetchPeriods()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingPeriod) return
    setEditError('')

    if (!editStartAt || !editEndAt) {
      setEditError(t.activity.errorRequired)
      return
    }

    const start = new Date(editStartAt + ':00Z')
    const end = new Date(editEndAt + ':00Z')
    const now = new Date()

    if (start >= end) {
      setEditError(t.activity.errorStartEnd)
      return
    }
    if (end <= now) {
      setEditError(t.activity.errorPast)
      return
    }

    setUpdating(true)
    try {
      const res = await fetch(`/api/activator/activity-periods/${editingPeriod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callsign: editCallsign,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          band: editBand,
          frequency: Number(editFrequency),
          mode: editMode,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'overlap') setEditError(t.activity.errorOverlap)
        else if (data.error === 'past') setEditError(t.activity.errorPast)
        else setEditError(data.error ?? t.activity.errorRequired)
        return
      }
      toast.success(t.activity.updatedOk)
      setEditingPeriod(null)
      fetchPeriods()
    } finally {
      setUpdating(false)
    }
  }

  async function handleDelete(p: Period) {
    if (!confirm(t.activity.deleteConfirm(p.band, p.mode))) return
    const res = await fetch(`/api/activator/activity-periods/${p.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(t.activity.deletedOk)
      if (editingPeriod?.id === p.id) setEditingPeriod(null)
      fetchPeriods()
    }
  }

  return (
    <div className="space-y-6">
      {editingPeriod ? (
        /* Edit form */
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.activity.editPeriod}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="editStartAt">{t.activity.startAt}</Label>
                  <Input
                    id="editStartAt"
                    type="datetime-local"
                    value={editStartAt}
                    onChange={e => setEditStartAt(e.target.value)}
                    disabled={new Date(editingPeriod.startAt) < new Date()}
                    required
                  />
                  {new Date(editingPeriod.startAt) < new Date() && (
                    <p className="text-xs text-muted-foreground">Period already started — start time is locked.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editEndAt">{t.activity.endAt}</Label>
                  <Input
                    id="editEndAt"
                    type="datetime-local"
                    value={editEndAt}
                    onChange={e => setEditEndAt(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1 max-w-xs">
                <Label>{t.activity.callsign}</Label>
                <select
                  value={editCallsign}
                  onChange={e => setEditCallsign(e.target.value)}
                  className={SELECT_CLS}
                >
                  {callsignOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>{t.activity.band}</Label>
                  <select
                    value={editBand}
                    onChange={e => handleEditBandChange(e.target.value)}
                    className={SELECT_CLS}
                  >
                    {BANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editFreq">{t.activity.frequency}</Label>
                  <Input
                    id="editFreq"
                    type="number"
                    min={1}
                    value={editFrequency}
                    onChange={e => setEditFrequency(e.target.value)}
                    className="font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t.activity.mode}</Label>
                  <select
                    value={editMode}
                    onChange={e => setEditMode(e.target.value)}
                    className={SELECT_CLS}
                  >
                    {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {editError && <p className="text-sm text-destructive">{editError}</p>}

              <div className="flex gap-2">
                <Button type="submit" disabled={updating}>
                  {updating && <Spinner className="mr-2 h-4 w-4" />}
                  {updating ? t.activity.saving : t.activity.save}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  {t.activity.cancel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Add form */
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

              <div className="space-y-1 max-w-xs">
                <Label>{t.activity.callsign}</Label>
                <select
                  value={callsign}
                  onChange={e => setCallsign(e.target.value)}
                  className={SELECT_CLS}
                >
                  {callsignOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={repeatDaily}
                    onChange={e => setRepeatDaily(e.target.checked)}
                    className="size-4 accent-primary cursor-pointer"
                  />
                  {t.activity.repeatDaily}
                </label>
                {repeatDaily && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="repeatCount" className="whitespace-nowrap">{t.activity.repeatCount}</Label>
                    <Input
                      id="repeatCount"
                      type="number"
                      min={2}
                      max={30}
                      value={repeatCount}
                      onChange={e => setRepeatCount(e.target.value)}
                      className="w-20 font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>{t.activity.band}</Label>
                  <select
                    value={band}
                    onChange={e => handleBandChange(e.target.value)}
                    className={SELECT_CLS}
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
                    className={SELECT_CLS}
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
      )}

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
                  {(
                    [
                      { key: 'callsign', label: t.activity.colCallsign },
                      { key: 'startAt', label: t.activity.colStart },
                      { key: 'endAt', label: t.activity.colEnd },
                      { key: 'band', label: t.activity.colBand },
                      { key: 'frequency', label: t.activity.colFreq },
                      { key: 'mode', label: t.activity.colMode },
                    ] as { key: keyof Period; label: string }[]
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
                  <TableHead>{t.activity.colOperatedBy}</TableHead>
                  <TableHead className="text-right">{t.activity.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPeriods.map(p => {
                  const isPast = new Date(p.endAt) <= new Date()
                  const isEditing = editingPeriod?.id === p.id
                  return (
                    <TableRow key={p.id} className={isEditing ? 'bg-muted/50' : undefined}>
                      <TableCell className="font-mono font-medium text-sm">{p.callsign}</TableCell>
                      <TableCell className="text-sm font-mono">{fmtUtc(p.startAt)}</TableCell>
                      <TableCell className="text-sm font-mono">{fmtUtc(p.endAt)}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-mono">{p.band}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{p.frequency}</TableCell>
                      <TableCell><Badge variant="outline">{p.mode}</Badge></TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{activatorCallsign}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant={isEditing ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => isEditing ? handleCancelEdit() : handleEditStart(p)}
                            disabled={isPast}
                          >
                            {isEditing ? t.activity.cancel : t.activity.edit}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(p)}>
                            {t.activity.delete}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
