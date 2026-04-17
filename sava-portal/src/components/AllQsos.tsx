'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

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
  logFile: { filename: string }
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

export function AllQsos() {
  const [qsos, setQsos] = useState<Qso[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/activator/qsos')
      .then(r => r.json())
      .then(d => { setQsos(d); setLoading(false) })
  }, [])

  if (loading) return <p className="text-muted-foreground">Loading…</p>

  const unique = qsos.filter(q => !q.isDuplicate)
  const dupes = qsos.filter(q => q.isDuplicate)

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Total: <strong>{qsos.length}</strong></span>
        <span>Unique: <strong className="text-green-600">{unique.length}</strong></span>
        <span>Duplicates: <strong className="text-amber-600">{dupes.length}</strong></span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">QSO Log</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {qsos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No QSOs found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Hunter</TableHead>
                  <TableHead>Band</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Freq (kHz)</TableHead>
                  <TableHead>Date/Time (UTC)</TableHead>
                  <TableHead>Sent RST</TableHead>
                  <TableHead>Rcvd RST</TableHead>
                  <TableHead>Log File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qsos.map(q => (
                  <TableRow key={q.id} className={q.isDuplicate ? 'opacity-60 bg-amber-50 dark:bg-amber-950/20' : ''}>
                    <TableCell>
                      {q.isDuplicate
                        ? <Badge variant="outline" className="text-amber-600 border-amber-400">DUP</Badge>
                        : <Badge variant="outline" className="text-green-600 border-green-400">OK</Badge>
                      }
                    </TableCell>
                    <TableCell className="font-mono font-medium">{q.hunterCall}</TableCell>
                    <TableCell>{q.band}</TableCell>
                    <TableCell>{q.mode}</TableCell>
                    <TableCell className="font-mono">{q.frequency}</TableCell>
                    <TableCell className="text-sm">{fmt(q.datetime)}</TableCell>
                    <TableCell>{q.sentRst}</TableCell>
                    <TableCell>{q.rcvdRst}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{q.logFile.filename}</TableCell>
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
