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
  logFile: { filename: string }
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

export function AdminAllQsos() {
  const [qsos, setQsos] = useState<Qso[]>([])
  const [loading, setLoading] = useState(true)
  const [callsignFilter, setCallsignFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const t = useT()

  useEffect(() => {
    fetch('/api/admin/qsos')
      .then(r => r.json())
      .then(d => { setQsos(d); setLoading(false) })
  }, [])

  const callsigns = useMemo(
    () => [...new Set(qsos.map(q => q.activatorCall))].sort(),
    [qsos],
  )

  const filtered = useMemo(() => {
    return qsos.filter(q => {
      if (callsignFilter && q.activatorCall !== callsignFilter) return false
      if (dateFrom) {
        const from = new Date(dateFrom)
        if (new Date(q.datetime) < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(q.datetime) > to) return false
      }
      return true
    })
  }, [qsos, callsignFilter, dateFrom, dateTo])

  const isFiltered = callsignFilter || dateFrom || dateTo

  function resetFilters() {
    setCallsignFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  if (loading) return <p className="text-muted-foreground">{t.logFile.loading}</p>

  const unique = filtered.filter(q => !q.isDuplicate).length
  const dupes = filtered.filter(q => q.isDuplicate).length
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

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
        <CardContent className="overflow-x-auto">
          {qsos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t.allQsos.noQsos}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t.admin.filterShowingQsos(0, qsos.length)}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.logFile.colStatus}</TableHead>
                    <TableHead>{t.admin.colActivator}</TableHead>
                    <TableHead>{t.logFile.colHunter}</TableHead>
                    <TableHead>{t.logFile.colBand}</TableHead>
                    <TableHead>{t.logFile.colMode}</TableHead>
                    <TableHead>{t.logFile.colFreq}</TableHead>
                    <TableHead>{t.logFile.colDateTime}</TableHead>
                    <TableHead>{t.logFile.colSentRst}</TableHead>
                    <TableHead>{t.logFile.colRcvdRst}</TableHead>
                    <TableHead>{t.allQsos.colLogFile}</TableHead>
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
                      <TableCell className="font-mono font-semibold">{q.activatorCall}</TableCell>
                      <TableCell className="font-mono font-medium">{q.hunterCall}</TableCell>
                      <TableCell>{q.band}</TableCell>
                      <TableCell>{q.mode}</TableCell>
                      <TableCell className="font-mono">{q.frequency}</TableCell>
                      <TableCell className="text-sm">{fmt(q.datetime)}</TableCell>
                      <TableCell className="text-sm">{q.sentRst}{q.sentExch ? ` / ${q.sentExch}` : ''}</TableCell>
                      <TableCell className="text-sm">{q.rcvdRst}{q.rcvdExch ? ` / ${q.rcvdExch}` : ''}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{q.logFile.filename}</TableCell>
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
