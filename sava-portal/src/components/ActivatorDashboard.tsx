'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
}

function fmt(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

export function ActivatorDashboard() {
  const [logs, setLogs] = useState<LogFile[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<LogFile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [sortKey, setSortKey] = useState<keyof Omit<LogFile, 'id'>>('uploadedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const t = useT()

  function handleSort(key: keyof Omit<LogFile, 'id'>) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av ?? '').localeCompare(String(bv ?? ''), undefined, { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [logs, sortKey, sortDir])

  const fetchLogs = useCallback(async () => {
    const res = await fetch('/api/activator/logs')
    const data = await res.json()
    setLogs(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/activator/logs/${deleteTarget.id}`, { method: 'DELETE' })
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
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground text-sm">{t.dashboard.filesUploaded(logs.length)}</p>
        <Link href="/activator/upload">
          <Button>{t.dashboard.uploadLogFile}</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t.dashboard.uploadedLogFiles}</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t.dashboard.noFiles}{' '}
              <Link href="/activator/upload" className="underline">{t.dashboard.noFilesLink}</Link>.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {(
                    [
                      { key: 'filename', label: t.dashboard.colFilename },
                      { key: 'fileType', label: t.dashboard.colType },
                      { key: 'uploadedAt', label: t.dashboard.colUploaded },
                      { key: 'qsoCount', label: t.dashboard.colQsos },
                      { key: 'firstQsoAt', label: t.dashboard.colFirstQso },
                      { key: 'lastQsoAt', label: t.dashboard.colLastQso },
                    ] as { key: keyof Omit<LogFile, 'id'>; label: string }[]
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
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLogs.map(l => (
                  <TableRow key={l.id}>
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
                        <Link href={`/activator/logs/${l.id}`}>
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
