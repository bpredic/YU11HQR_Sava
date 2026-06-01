'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
  sentExch: string
  rcvdExch: string
  isDuplicate: boolean
  duplicateOfId: number | null
  logFile: { filename: string }
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

type SortKey = 'isDuplicate' | 'activatorCall' | 'hunterCall' | 'band' | 'mode' | 'frequency' | 'datetime' | 'sentRst' | 'rcvdRst'

export function AdminAllQsos() {
  const [qsos, setQsos] = useState<Qso[]>([])
  const [loading, setLoading] = useState(true)
  const [callsignFilter, setCallsignFilter] = useState('')
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
    fetch('/api/admin/qsos')
      .then(r => r.json())
      .then(d => { setQsos(d); setLoading(false) })
  }, [])

  const callsigns = useMemo(
    () => [...new Set(qsos.map(q => q.activatorCall))].sort(),
    [qsos],
  )
  const bands = useMemo(() => [...new Set(qsos.map(q => q.band))].sort(), [qsos])
  const modes = useMemo(() => [...new Set(qsos.map(q => q.mode))].sort(), [qsos])

  const filtered = useMemo(() => {
    return qsos.filter(q => {
      if (callsignFilter && q.activatorCall !== callsignFilter) return false
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
  }, [qsos, callsignFilter, statusFilter, bandFilter, modeFilter, dateFrom, dateTo])

  const isFiltered = callsignFilter || statusFilter || bandFilter || modeFilter || dateFrom || dateTo

  function resetFilters() {
    setCallsignFilter('')
    setStatusFilter('')
    setBandFilter('')
    setModeFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      let cmp: number
      if (typeof av === 'boolean') cmp = Number(av) - Number(bv)
      else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Spinner className="h-4 w-4" />{t.logFile.loading}</div>

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
              <Label className="text-xs">{t.admin.filterActivator}</Label>
              <select
                value={callsignFilter}
                onChange={e => { setCallsignFilter(e.target.value); setPage(1) }}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t.admin.filterAllActivators}</option>
                {callsigns.map(cs => (
                  <option key={cs} value={cs}>{cs}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t.allQsos.filterStatus}</Label>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t.allQsos.filterAllModes}</option>
                {modes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t.admin.filterDateFrom}</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                className="h-9 w-40"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t.admin.filterDateTo}</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1) }}
                className="h-9 w-40"
              />
            </div>

            {isFiltered && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="self-end">
                {t.admin.filterReset}
              </Button>
            )}

            <p className="text-sm text-muted-foreground self-end ml-auto">
              {isFiltered
                ? t.admin.filterShowingQsos(filtered.length, qsos.length)
                : `${qsos.length} QSOs`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted p-3 text-center">
          <div className="text-2xl font-bold">{filtered.length}</div>
          <div className="text-xs text-muted-foreground">{t.logFile.totalQsos}</div>
        </div>
        <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3 text-center">
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">{unique}</div>
          <div className="text-xs text-muted-foreground">{t.allQsos.unique}</div>
        </div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 text-center">
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{dupes}</div>
          <div className="text-xs text-muted-foreground">{t.logFile.duplicates}</div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.logFile.contacts}</CardTitle>
        </CardHeader>
        <CardContent>
          {qsos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t.allQsos.noQsos}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t.admin.filterShowingQsos(0, qsos.length)}</p>
          ) : (
            <>
              <Table containerClassName="max-h-[600px]">
                <TableHeader>
                  <TableRow>
                    {(
                      [
                        { key: 'isDuplicate', label: t.logFile.colStatus },
                        { key: 'activatorCall', label: t.admin.colActivator },
                        { key: 'hunterCall', label: t.logFile.colHunter },
                        { key: 'band', label: t.logFile.colBand },
                        { key: 'mode', label: t.logFile.colMode },
                        { key: 'frequency', label: t.logFile.colFreq },
                        { key: 'datetime', label: t.logFile.colDateTime },
                        { key: 'sentRst', label: t.logFile.colSentRst },
                        { key: 'rcvdRst', label: t.logFile.colRcvdRst },
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
                    <TableHead>{t.allQsos.colLogFile}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map(q => (
                    <TableRow key={q.id} className={q.isDuplicate ? 'opacity-50 bg-amber-50 dark:bg-amber-950/20' : ''}>
                      <TableCell>
                        {q.isDuplicate
                          ? <DupBadge qso={q} allQsos={qsos} />
                          : <Badge variant="outline" className="text-green-600 border-green-400">{t.logFile.ok}</Badge>
                        }
                      </TableCell>
                      <TableCell className="font-mono font-semibold">{q.activatorCall}</TableCell>
                      <TableCell className="font-mono font-medium">{q.hunterCall}</TableCell>
                      <TableCell>{q.band}</TableCell>
                      <TableCell>{q.mode}</TableCell>
                      <TableCell className="font-mono">{q.frequency}</TableCell>
                      <TableCell className="text-sm">{fmt(q.datetime)}</TableCell>
                      <TableCell className="text-sm">{q.sentRst}{q.sentExch ? ` / ${q.sentExch}` : ''}</TableCell>
                      <TableCell className="text-sm">{q.rcvdRst}{q.rcvdExch ? ` / ${q.rcvdExch}` : ''}</TableCell>
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
