'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useT } from '@/components/TranslationsProvider'
import { QsoPagination } from '@/components/QsoPagination'
import { Spinner } from '@/components/ui/spinner'
import { FilenameCell } from '@/components/ui/filename-cell'
import { DupBadge } from '@/components/DupBadge'

type Qso = {
  id: number
  activatorCall: string
  hunterCall: string
  frequency: number
  band: string
  mode: string
  datetime: string
  sentRst: string
  rcvdRst: string
  isDuplicate: boolean
  duplicateOfId: number | null
  logFile: { filename: string }
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
}

function adifField(name: string, value: string): string {
  return `<${name}:${value.length}>${value}`
}

function exportAdif(qsos: Qso[]) {
  const today = new Date().toISOString().slice(0, 10)
  const rows: string[] = [
    `Sava River Days 2026 ADIF export ${today}`,
    '<EOH>',
    '',
  ]
  for (const q of qsos) {
    const dt = new Date(q.datetime)
    const pad = (n: number) => String(n).padStart(2, '0')
    const date = `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`
    const time = `${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}`
    const parts = [
      adifField('QSO_DATE', date),
      adifField('TIME_ON', time),
      adifField('BAND', q.band.toLowerCase()),
      adifField('MODE', q.mode),
      adifField('CALL', q.hunterCall),
      adifField('OPERATOR', q.activatorCall),
    ]
    if (q.sentRst) parts.push(adifField('RST_SENT', q.sentRst))
    if (q.rcvdRst) parts.push(adifField('RST_RCVD', q.rcvdRst))
    rows.push(parts.join(' ') + ' <EOR>')
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sava-river-days-2026-${today}.adi`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

type SortKey = 'isDuplicate' | 'hunterCall' | 'band' | 'mode' | 'frequency' | 'datetime' | 'sentRst' | 'rcvdRst' | 'filename'

function getSortValue(q: Qso, key: SortKey): string | number | boolean {
  if (key === 'filename') return q.logFile.filename
  return q[key]
}

export function AllQsos() {
  const [qsos, setQsos] = useState<Qso[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [bandFilter, setBandFilter] = useState('')
  const [modeFilter, setModeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortKey, setSortKey] = useState<SortKey>('datetime')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const t = useT()

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  useEffect(() => {
    fetch('/api/activator/qsos')
      .then(r => r.json())
      .then(d => { setQsos(d); setLoading(false) })
  }, [])

  const bands = useMemo(() => [...new Set(qsos.map(q => q.band))].sort(), [qsos])
  const modes = useMemo(() => [...new Set(qsos.map(q => q.mode))].sort(), [qsos])

  const filtered = useMemo(() => {
    return qsos.filter(q => {
      if (statusFilter === 'ok' && q.isDuplicate) return false
      if (statusFilter === 'dup' && !q.isDuplicate) return false
      if (bandFilter && q.band !== bandFilter) return false
      if (modeFilter && q.mode !== modeFilter) return false
      if (dateFrom && new Date(q.datetime) < new Date(dateFrom)) return false
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(q.datetime) > to) return false
      }
      return true
    })
  }, [qsos, statusFilter, bandFilter, modeFilter, dateFrom, dateTo])

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, sortKey)
      const bv = getSortValue(b, sortKey)
      let cmp: number
      if (typeof av === 'boolean') cmp = Number(av) - Number(bv)
      else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const isFiltered = statusFilter || bandFilter || modeFilter || dateFrom || dateTo

  function resetFilters() {
    setStatusFilter('')
    setBandFilter('')
    setModeFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Spinner className="h-4 w-4" />{t.allQsos.loading}</div>

  const selectClass = 'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

  const unique = filtered.filter(q => !q.isDuplicate).length
  const dupes = filtered.filter(q => q.isDuplicate).length
  const paginated = sortedFiltered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">{t.allQsos.filterStatus}</Label>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                className={selectClass}
              >
                <option value="">{t.allQsos.filterAllStatuses}</option>
                <option value="ok">{t.allQsos.ok}</option>
                <option value="dup">{t.allQsos.dup}</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t.allQsos.filterBand}</Label>
              <select
                value={bandFilter}
                onChange={e => { setBandFilter(e.target.value); setPage(1) }}
                className={selectClass}
              >
                <option value="">{t.allQsos.filterAllBands}</option>
                {bands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t.allQsos.filterMode}</Label>
              <select
                value={modeFilter}
                onChange={e => { setModeFilter(e.target.value); setPage(1) }}
                className={selectClass}
              >
                <option value="">{t.allQsos.filterAllModes}</option>
                {modes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t.allQsos.filterDateFrom}</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                className="h-9 w-40"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t.allQsos.filterDateTo}</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1) }}
                className="h-9 w-40"
              />
            </div>

            {isFiltered && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="self-end">
                {t.allQsos.filterReset}
              </Button>
            )}

            <p className="text-sm text-muted-foreground self-end ml-auto">
              {isFiltered
                ? t.allQsos.filterShowing(filtered.length, qsos.length)
                : `${qsos.length} QSOs`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{t.allQsos.total} <strong>{filtered.length}</strong></span>
        <span>{t.allQsos.unique} <strong className="text-green-600">{unique}</strong></span>
        <span>{t.allQsos.duplicates} <strong className="text-amber-600">{dupes}</strong></span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">{t.allQsos.qsoLog}</CardTitle>
            {filtered.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => exportAdif(filtered)}>
                {t.allQsos.exportAdif}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {qsos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t.allQsos.noQsos}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t.allQsos.filterShowing(0, qsos.length)}</p>
          ) : (
            <>
              <Table containerClassName="max-h-[600px]">
                <TableHeader>
                  <TableRow>
                    {(
                      [
                        { key: 'isDuplicate', label: t.allQsos.colStatus },
                        { key: 'hunterCall', label: t.allQsos.colHunter },
                        { key: 'band', label: t.allQsos.colBand },
                        { key: 'mode', label: t.allQsos.colMode },
                        { key: 'frequency', label: t.allQsos.colFreq },
                        { key: 'datetime', label: t.allQsos.colDateTime },
                        { key: 'sentRst', label: t.allQsos.colSentRst },
                        { key: 'rcvdRst', label: t.allQsos.colRcvdRst },
                        { key: 'filename', label: t.allQsos.colLogFile },
                      ] as { key: SortKey; label: string }[]
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
                  {paginated.map(q => (
                    <TableRow key={q.id} className={q.isDuplicate ? 'opacity-60 bg-amber-50 dark:bg-amber-950/20' : ''}>
                      <TableCell>
                        {q.isDuplicate
                          ? <DupBadge qso={q} allQsos={qsos} />
                          : <Badge variant="outline" className="text-green-600 border-green-400">{t.allQsos.ok}</Badge>
                        }
                      </TableCell>
                      <TableCell className="font-mono font-medium">{q.hunterCall}</TableCell>
                      <TableCell>{q.band}</TableCell>
                      <TableCell>{q.mode}</TableCell>
                      <TableCell className="font-mono">{q.frequency}</TableCell>
                      <TableCell className="text-sm">{fmt(q.datetime)}</TableCell>
                      <TableCell>{q.sentRst}</TableCell>
                      <TableCell>{q.rcvdRst}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <FilenameCell filename={q.logFile.filename} maxWidth={140} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <QsoPagination
                total={filtered.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
