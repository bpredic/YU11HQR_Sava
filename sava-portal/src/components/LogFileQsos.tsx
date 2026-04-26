'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useT } from '@/components/TranslationsProvider'
import { QsoPagination } from '@/components/QsoPagination'
import { Spinner } from '@/components/ui/spinner'

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
}

type LogFile = {
  id: number
  filename: string
  fileType: string
  uploadedAt: string
  qsoCount: number
  firstQsoAt: string | null
  lastQsoAt: string | null
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

const selectClass = 'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

type SortKey = 'isDuplicate' | 'hunterCall' | 'band' | 'mode' | 'frequency' | 'datetime' | 'sentRst' | 'rcvdRst'

export function LogFileQsos({ logFileId, backHref = '/activator' }: { logFileId: number; backHref?: string }) {
  const [logFile, setLogFile] = useState<LogFile | null>(null)
  const [qsos, setQsos] = useState<Qso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [bandFilter, setBandFilter] = useState('')
  const [modeFilter, setModeFilter] = useState('')
  const [hunterFilter, setHunterFilter] = useState('')
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
    fetch(`/api/activator/logs/${logFileId}/qsos`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setLogFile(d.logFile)
        setQsos(d.qsos)
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [logFileId])

  const bands = useMemo(() => [...new Set(qsos.map(q => q.band))].sort(), [qsos])
  const modes = useMemo(() => [...new Set(qsos.map(q => q.mode))].sort(), [qsos])

  const filtered = useMemo(() => {
    const h = hunterFilter.trim().toUpperCase()
    return qsos.filter(q => {
      if (statusFilter === 'ok' && q.isDuplicate) return false
      if (statusFilter === 'dup' && !q.isDuplicate) return false
      if (bandFilter && q.band !== bandFilter) return false
      if (modeFilter && q.mode !== modeFilter) return false
      if (h && !q.hunterCall.toUpperCase().includes(h)) return false
      return true
    })
  }, [qsos, statusFilter, bandFilter, modeFilter, hunterFilter])

  const isFiltered = statusFilter || bandFilter || modeFilter || hunterFilter.trim()

  function resetFilters() {
    setStatusFilter('')
    setBandFilter('')
    setModeFilter('')
    setHunterFilter('')
    setPage(1)
  }

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Spinner className="h-4 w-4" />{t.logFile.loading}</div>
  if (error) return <p className="text-destructive">{error}</p>

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

  const unique = filtered.filter(q => !q.isDuplicate).length
  const dupes = filtered.filter(q => q.isDuplicate).length
  const paginated = sortedFiltered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={backHref}><Button variant="outline" size="sm">{t.logFile.backToLogs}</Button></Link>
        <h1 className="text-xl font-bold font-mono">{logFile?.filename}</h1>
        <Badge variant="outline">{logFile?.fileType.toUpperCase()}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted p-3 text-center">
          <div className="text-2xl font-bold">{qsos.length}</div>
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

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">{t.logFile.filterStatus}</Label>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                className={selectClass}
              >
                <option value="">{t.logFile.filterAllStatuses}</option>
                <option value="ok">{t.logFile.ok}</option>
                <option value="dup">{t.logFile.dup}</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.logFile.filterBand}</Label>
              <select
                value={bandFilter}
                onChange={e => { setBandFilter(e.target.value); setPage(1) }}
                className={selectClass}
              >
                <option value="">{t.logFile.filterAllBands}</option>
                {bands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.logFile.filterMode}</Label>
              <select
                value={modeFilter}
                onChange={e => { setModeFilter(e.target.value); setPage(1) }}
                className={selectClass}
              >
                <option value="">{t.logFile.filterAllModes}</option>
                {modes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.logFile.filterHunter}</Label>
              <Input
                value={hunterFilter}
                onChange={e => { setHunterFilter(e.target.value); setPage(1) }}
                placeholder={t.logFile.filterHunterPlaceholder}
                className="h-9 w-36 font-mono uppercase"
              />
            </div>
            {isFiltered && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="self-end">
                {t.logFile.filterReset}
              </Button>
            )}
            {isFiltered && (
              <p className="text-xs text-muted-foreground self-end pb-1">
                {t.logFile.filterShowing(filtered.length, qsos.length)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.logFile.contacts}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table containerClassName="max-h-[600px]">
            <TableHeader>
              <TableRow>
                {(
                  [
                    { key: 'isDuplicate', label: t.logFile.colStatus },
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(q => (
                <TableRow key={q.id} className={q.isDuplicate ? 'opacity-50 bg-amber-50 dark:bg-amber-950/20' : ''}>
                  <TableCell>
                    {q.isDuplicate
                      ? <Badge variant="outline" className="text-amber-600 border-amber-400">{t.logFile.dup}</Badge>
                      : <Badge variant="outline" className="text-green-600 border-green-400">{t.logFile.ok}</Badge>
                    }
                  </TableCell>
                  <TableCell className="font-mono font-medium">{q.hunterCall}</TableCell>
                  <TableCell>{q.band}</TableCell>
                  <TableCell>{q.mode}</TableCell>
                  <TableCell className="font-mono">{q.frequency}</TableCell>
                  <TableCell className="text-sm">{fmt(q.datetime)}</TableCell>
                  <TableCell className="text-sm">{q.sentRst}{q.sentExch ? ` / ${q.sentExch}` : ''}</TableCell>
                  <TableCell className="text-sm">{q.rcvdRst}{q.rcvdExch ? ` / ${q.rcvdExch}` : ''}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  )
}
