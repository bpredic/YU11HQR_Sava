'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useT } from '@/components/TranslationsProvider'

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
  const t = useT()

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

  if (loading) return <p className="text-muted-foreground">{t.dashboard.loading}</p>

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
                {logs.map(l => (
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
