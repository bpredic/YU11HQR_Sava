'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useT } from '@/components/TranslationsProvider'

type QsoBase = {
  id: number
  hunterCall: string
  band: string
  mode: string
  frequency: number
  datetime: string
  sentRst: string
  rcvdRst: string
  duplicateOfId: number | null
  logFile?: { filename: string }
}

function fmtUtc(dt: string) {
  return new Date(dt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'
}

export function DupBadge<Q extends QsoBase>({ qso, allQsos }: { qso: Q; allQsos: Q[] }) {
  const [open, setOpen] = useState(false)
  const t = useT()
  const original = qso.duplicateOfId != null ? (allQsos.find(q => q.id === qso.duplicateOfId) ?? null) : null

  return (
    <>
      <button onClick={() => setOpen(true)}>
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

          {original ? (
            <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <span className="text-muted-foreground">Hunter</span>
              <span className="font-mono font-semibold">{original.hunterCall}</span>

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
