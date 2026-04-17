'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  const t = useT()

  const fetchLogs = useCallback(async () => {
    const res = await fetch('/api/activator/logs')
    const data = await res.json()
    setLogs(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  if (loading) return <p className="text-muted-foreground">{t.dashboard.loading}</p>

  return (
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
                      <Link href={`/activator/logs/${l.id}`}>
                        <Button variant="outline" size="sm">{t.dashboard.viewQsos}</Button>
                      </Link>
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
