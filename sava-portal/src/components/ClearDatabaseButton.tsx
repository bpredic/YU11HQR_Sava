'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2Icon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useT } from '@/components/TranslationsProvider'

type Props = {
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ClearDatabaseButton({ className, open: controlledOpen, onOpenChange }: Props) {
  const t = useT()
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  function setOpen(value: boolean) {
    if (!value) setAgreed(false)
    if (isControlled) onOpenChange?.(value)
    else setInternalOpen(value)
  }

  async function handleClear() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/clear-database', { method: 'DELETE' })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!isControlled && (
        <Button
          variant="destructive"
          size="sm"
          className={className}
          onClick={() => setOpen(true)}
        >
          <Trash2Icon className="size-4" />
          {t.admin.clearDatabase}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <TriangleAlertIcon className="size-8 text-destructive shrink-0" />
              <DialogTitle className="text-destructive text-lg">
                {t.admin.clearDatabaseTitle}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4 text-sm space-y-2">
              <p className="font-bold text-destructive text-base">
                {t.admin.clearDatabaseWarningHeading}
              </p>
              <p>{t.admin.clearDatabaseWarningBody}</p>
              <ul className="list-disc pl-5 space-y-1 text-destructive font-medium">
                <li>{t.admin.clearDatabaseItem1}</li>
                <li>{t.admin.clearDatabaseItem2}</li>
              </ul>
              <p className="font-bold text-destructive">{t.admin.clearDatabaseIrreversible}</p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 size-5 accent-destructive cursor-pointer"
              />
              <span className="text-sm font-medium">{t.admin.clearDatabaseAgree}</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              {t.admin.clearDatabaseCancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleClear}
              disabled={!agreed || loading}
            >
              {loading ? t.admin.clearDatabaseClearing : t.admin.clearDatabaseConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
