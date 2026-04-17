'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useT } from '@/components/TranslationsProvider'

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
  confirmed: boolean
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

export function LogFileQsos({ logFileId }: { logFileId: number }) {
  const [logFile, setLogFile] = useState<LogFile | null>(null)
  const [qsos, setQsos] = useState<Qso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const t = useT()

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

  if (loading) return <p className="text-muted-foreground">{t.logFile.loading}</p>
  if (error) return <p className="text-destructive">{error}</p>

  const confirmedCount = qsos.filter(q => q.confirmed && !q.isDuplicate).length
  const unconfirmedCount = qsos.filter(q => !q.confirmed && !q.isDuplicate).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/activator"><Button variant="outline" size="sm">{t.logFile.backToLogs}</Button></Link>
        <h1 className="text-xl font-bold font-mono">{logFile?.filename}</h1>
        <Badge variant="outline">{logFile?.fileType.toUpperCase()}</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-muted p-3 text-center">
          <div className="text-2xl font-bold">{qsos.length}</div>
          <div className="text-xs text-muted-foreground">{t.logFile.totalQsos}</div>
        </div>
        <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3 text-center">
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">{confirmedCount}</div>
          <div className="text-xs text-muted-foreground">{t.logFile.confirmed}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <div className="text-2xl font-bold text-slate-500">{unconfirmedCount}</div>
          <div className="text-xs text-muted-foreground">{t.logFile.unconfirmed}</div>
        </div>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 text-center">
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            {qsos.filter(q => q.isDuplicate).length}
          </div>
          <div className="text-xs text-muted-foreground">{t.logFile.duplicates}</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.logFile.contacts}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.logFile.colStatus}</TableHead>
                <TableHead>{t.logFile.colHunter}</TableHead>
                <TableHead>{t.logFile.colBand}</TableHead>
                <TableHead>{t.logFile.colMode}</TableHead>
                <TableHead>{t.logFile.colFreq}</TableHead>
                <TableHead>{t.logFile.colDateTime}</TableHead>
                <TableHead>{t.logFile.colSentRst}</TableHead>
                <TableHead>{t.logFile.colRcvdRst}</TableHead>
                <TableHead>{t.logFile.colCrossRef}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qsos.map(q => (
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
                  <TableCell>
                    {!q.isDuplicate && (
                      q.confirmed
                        ? <Badge className="bg-green-600 hover:bg-green-600 text-white">{t.logFile.confirmedBadge}</Badge>
                        : <Badge variant="secondary">{t.logFile.unconfirmedBadge}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
