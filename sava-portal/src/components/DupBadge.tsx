'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { useT } from '@/components/TranslationsProvider'

type QsoBase = {
  id: number
  activatorCall: string
  hunterCall: string
  band: string
  mode: string
  frequency: number
  datetime: string
  sentRst: string
  rcvdRst: string
  isDuplicate: boolean
  duplicateOfId: number | null
  logFile?: { filename: string }
}

type OriginalQso = {
  id: number
  activatorCall: string
  hunterCall: string
  band: string
  mode: string
  frequency: number
  datetime: string
  sentRst: string
  rcvdRst: string
  logFile?: { filename: string }
}

function fmtUtc(dt: string) {
  return new Date(dt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
}

async function fetchById(id: number): Promise<OriginalQso | null> {
  const r = await fetch(`/api/qso/${id}`)
  return r.ok ? r.json() : null
}

async function fetchByKey(q: QsoBase): Promise<OriginalQso | null> {
  const params = new URLSearchParams({
    activatorCall: q.activatorCall,
    hunterCall: q.hunterCall,
    band: q.band,
    mode: q.mode,
  })
  const r = await fetch(`/api/qso/find-original?${params}`)
  return r.ok ? r.json() : null
}

export function DupBadge<Q extends QsoBase>({ qso, allQsos }: { qso: Q; allQsos: Q[] }) {
  const [open, setOpen] = useState(false)
  const [original, setOriginal] = useState<OriginalQso | null | 'loading'>('loading')
  const t = useT()

  async function handleOpen() {
    setOpen(true)
    if (original !== 'loading') return

    // Step 1: if we know the ID, fetch it directly (works across all log files)
    if (qso.duplicateOfId != null) {
      const found = await fetchById(qso.duplicateOfId)
      setOriginal(found)
      return
    }

    // Step 2: within-file dup (duplicateOfId null) — try loaded data first (fast)
    const inMemory = allQsos.find(q =>
      !q.isDuplicate &&
      q.activatorCall === qso.activatorCall &&
      q.hunterCall === qso.hunterCall &&
      q.band === qso.band &&
      q.mode === qso.mode,
    )
    if (inMemory) { setOriginal(inMemory); return }

    // Step 3: not in loaded data — query the database by key
    const found = await fetchByKey(qso)
    setOriginal(found)
  }

  return (
    <>
      <button onClick={handleOpen}>
        <Badge
          variant="outline"
          className="text-amber-600 border-amber-400 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/30"
        >
          {t.logFile.dup}
        </Badge>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.logFile.dupPopupTitle}</DialogTitle>
          </DialogHeader>

          {original === 'loading' ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
              <Spinner className="h-4 w-4" /> Loading…
            </div>
          ) : original ? (
            <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <span className="text-muted-foreground">Hunter</span>
              <span className="font-mono font-semibold">{original.hunterCall}</span>

              <span className="text-muted-foreground">Activator</span>
              <span className="font-mono">{original.activatorCall}</span>

              <span className="text-muted-foreground">Band / Mode</span>
              <span className="font-mono">{original.band} / {original.mode}</span>

              <span className="text-muted-foreground">Frequency</span>
              <span className="font-mono">{original.frequency} kHz</span>

              <span className="text-muted-foreground">Date/Time</span>
              <span className="font-mono text-xs">{fmtUtc(original.datetime)}</span>

              <span className="text-muted-foreground">Sent RST</span>
              <span className="font-mono">{original.sentRst}</span>

              <span className="text-muted-foreground">Rcvd RST</span>
              <span className="font-mono">{original.rcvdRst}</span>

              {original.logFile && (
                <>
                  <span className="text-muted-foreground">Log file</span>
                  <span className="font-mono text-xs text-muted-foreground break-all">{original.logFile.filename}</span>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.logFile.dupPopupNotFound}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
