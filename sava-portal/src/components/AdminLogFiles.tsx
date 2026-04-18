'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useT } from '@/components/TranslationsProvider'
import { Spinner } from '@/components/ui/spinner'

type LogFile = {
  id: number
  filename: string
  fileType: string
  uploadedAt: string
  qsoCount: number
  firstQsoAt: string | null
  lastQsoAt: string | null
  activator: { callsign: string }
}

function fmt(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

export function AdminLogFiles() {
  const [logs, setLogs] = useState<LogFile[]>([])
  const [loading, setLoading] = useState(true)
  const [callsignFilter, setCallsignFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<LogFile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const t = useT()

  function fetchLogs() {
    fetch('/api/admin/logs')
      .then(r => r.json())
      .then(d => { setLogs(d); setLoading(false) })
  }

  useEffect(() => { fetchLogs() }, [])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/logs/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success(t.dashboard.deleteLogSuccess(deleteTarget.filename))
      setDeleteTarget(null)
      fetchLogs()
    } catch {
      toast.error(t.dashboard.deleteLogFailed)
    } finally {
      setDeleting(false)
    }
  }

  const callsigns = useMemo(
    () => [...new Set(logs.map(l => l.activator.callsign))].sort(),
    [logs],
  )

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (callsignFilter && l.activator.callsign !== callsignFilter) return false
      if (dateFrom) {
        const from = new Date(dateFrom)
        if (new Date(l.uploadedAt) < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(l.uploadedAt) > to) return false
      }
      return true
    })
  }, [logs, callsignFilter, dateFrom, dateTo])

  const isFiltered = callsignFilter || dateFrom || dateTo

  function resetFilters() {
    setCallsignFilter('')
    setDateFrom('')
    setDateTo('')
  }

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Spinner className="h-4 w-4" />{t.dashboard.loading}</div>

  return (
    <>
    <Dialog open={deleteTarget !== null} onOpenChange={v => { if (!v) setDeleteTarget(null) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.dashboard.deleteLogConfirmTitle}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {deleteTarget && t.dashboard.deleteLogConfirmBody(deleteTarget.filename, deleteTarget.qsoCount)}
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            {t.dashboard.deleteLogCancel}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? '…' : t.dashboard.deleteLogConfirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <div className="space-y-4">
      {/* Filter bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">{t.admin.filterActivator}</Label>
              <select
                value={callsignFilter}
                onChange={e => setCallsignFilter(e.target.value)}
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
                onChange={e => setDateFrom(e.target.value)}
                className="h-9 w-40"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t.admin.filterDateTo}</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
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
                ? t.admin.filterShowing(filtered.length, logs.length)
                : t.dashboard.filesUploaded(logs.length)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t.admin.allLogFiles}</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t.dashboard.noFiles}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t.admin.filterShowing(0, logs.length)}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.colActivator}</TableHead>
                  <TableHead>{t.dashboard.colFilename}</TableHead>
                  <TableHead>{t.dashboard.colType}</TableHead>
                  <TableHead>{t.dashboard.colUploaded}</TableHead>
                  <TableHead className="text-right">{t.dashboard.colQsos}</TableHead>
                  <TableHead>{t.dashboard.colFirstQso}</TableHead>
                  <TableHead>{t.dashboard.colLastQso}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">{l.activator.callsign}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{l.filename}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{l.fileType.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{fmt(l.uploadedAt)}</TableCell>
                    <TableCell className="text-right font-medium">{l.qsoCount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(l.firstQsoAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(l.lastQsoAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/logs/${l.id}`}>
                          <Button variant="outline" size="sm">{t.dashboard.viewQsos}</Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteTarget(l)}
                        >
                          {t.dashboard.deleteLog}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  )
}
