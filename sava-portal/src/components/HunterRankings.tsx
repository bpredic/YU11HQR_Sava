'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useT } from '@/components/TranslationsProvider'
import type { RankingEntry } from '@/app/api/hunter/rankings/route'

const PAGE_SIZE = 10

export function HunterRankings() {
  const [data, setData] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const t = useT()

  useEffect(() => {
    fetch('/api/hunter/rankings')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE))
  const pageEntries = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-center">{t.rankings.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-6">
            <Spinner className="h-4 w-4" />{t.rankings.loading}
          </div>
        ) : data.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-6">{t.rankings.noData}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">{t.rankings.colRank}</TableHead>
                  <TableHead>{t.rankings.colCallsign}</TableHead>
                  <TableHead className="text-center">{t.rankings.colPoints}</TableHead>
                  <TableHead className="text-center">{t.rankings.colQsos}</TableHead>
                  <TableHead className="text-center">{t.rankings.diploma}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageEntries.map(entry => (
                  <TableRow key={entry.callsign}>
                    <TableCell className="text-center text-muted-foreground font-mono text-sm">
                      {entry.rank <= 3 ? (
                        <span className={entry.rank === 1 ? 'text-yellow-500' : entry.rank === 2 ? 'text-slate-400' : 'text-amber-600'}>
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : entry.rank}
                    </TableCell>
                    <TableCell>
                      <Link href={`/hunter/${entry.callsign}`} className="font-mono font-medium hover:underline">
                        {entry.callsign}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center font-bold">{entry.totalPoints}</TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm">{entry.scoringQsos}</TableCell>
                    <TableCell className="text-center">
                      {entry.qualifiesForDiploma
                        ? <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs">✓</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                  {t.rankings.prev}
                </Button>
                <span className="text-muted-foreground">{t.rankings.page(page, totalPages)}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                  {t.rankings.next}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
