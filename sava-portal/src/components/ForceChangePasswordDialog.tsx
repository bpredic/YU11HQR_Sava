'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useT } from '@/components/TranslationsProvider'

export function ForceChangePasswordDialog({ mustChange }: { mustChange: boolean }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const t = useT()
  const router = useRouter()

  if (!mustChange) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error(t.changePassword.tooShort)
      return
    }
    if (password !== confirm) {
      toast.error(t.changePassword.mismatch)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/activator/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed')
        return
      }
      toast.success(t.changePassword.success)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      modal
      disablePointerDismissal
      onOpenChange={() => {/* block all dismiss attempts */}}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t.changePassword.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t.changePassword.subtitle}</p>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="new-pw">{t.changePassword.newPassword}</Label>
            <Input
              id="new-pw"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-pw">{t.changePassword.confirmPassword}</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? t.changePassword.saving : t.changePassword.save}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
