'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
  isDuplicate: boolean
  logFile: { filename: string }
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

export function AllQsos() {
  const [qsos, setQsos] = useState<Qso[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const t = useT()

  useEffect(() => {
    fetch('/api/activator/qsos')
      .then(r => r.json())
      .then(d => { setQsos(d); setLoading(false) })
  }, [])

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Spinner className="h-4 w-4" />{t.allQsos.loading}</div>

  const unique = qsos.filter(q => !q.isDuplicate)
  const dupes = qsos.filter(q => q.isDuplicate)
  const paginated = qsos.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{t.allQsos.total} <strong>{qsos.length}</strong></span>
        <span>{t.allQsos.unique} <strong className="text-green-600">{unique.length}</strong></span>
        <span>{t.allQsos.duplicates} <strong className="text-amber-600">{dupes.length}</strong></span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.allQsos.qsoLog}</CardTitle>
        </CardHeader>
        <CardContent>
          {qsos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t.allQsos.noQsos}</p>
          ) : (
            <>
              <Table containerClassName="max-h-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.allQsos.colStatus}</TableHead>
                    <TableHead>{t.allQsos.colHunter}</TableHead>
                    <TableHead>{t.allQsos.colBand}</TableHead>
                    <TableHead>{t.allQsos.colMode}</TableHead>
                    <TableHead>{t.allQsos.colFreq}</TableHead>
                    <TableHead>{t.allQsos.colDateTime}</TableHead>
                    <TableHead>{t.allQsos.colSentRst}</TableHead>
                    <TableHead>{t.allQsos.colRcvdRst}</TableHead>
                    <TableHead>{t.allQsos.colLogFile}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map(q => (
                    <TableRow key={q.id} className={q.isDuplicate ? 'opacity-60 bg-amber-50 dark:bg-amber-950/20' : ''}>
                      <TableCell>
                        {q.isDuplicate
                          ? <Badge variant="outline" className="text-amber-600 border-amber-400">{t.allQsos.dup}</Badge>
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
                      <TableCell className="font-mono text-xs text-muted-foreground">{q.logFile.filename}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <QsoPagination
                total={qsos.length}
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
