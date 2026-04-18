'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useT } from '@/components/TranslationsProvider'
import type { PasswordError } from '@/lib/password'

type Props = {
  role: 'admin' | 'activator'
  triggerClassName?: string
}

export function ChangePasswordDialog({ role, triggerClassName }: Props) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const t = useT()

  function reset() {
    setCurrent('')
    setPassword('')
    setConfirm('')
  }

  function clientValidate(): string | null {
    if (password.length < 8) return t.changePassword.tooShort
    if (!/[A-Z]/.test(password)) return t.changePassword.noUppercase
    if (!/[0-9]/.test(password)) return t.changePassword.noNumber
    if (!/[^A-Za-z0-9]/.test(password)) return t.changePassword.noSpecial
    if (password !== confirm) return t.changePassword.mismatch
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = clientValidate()
    if (err) { toast.error(err); return }

    setSaving(true)
    const endpoint = role === 'admin'
      ? '/api/admin/change-password'
      : '/api/activator/change-password'

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        const key = data.error as PasswordError | string
        toast.error(
          t.changePassword[key as keyof typeof t.changePassword] as string ?? data.error
        )
        return
      }
      toast.success(t.changePassword.success)
      setOpen(false)
      reset()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger render={
        <Button
          variant="ghost"
          className={triggerClassName}
        />
      }>
        {t.changePassword.changePasswordNav}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.changePassword.titleVoluntary}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1">
            <Label htmlFor="cp-current">{t.changePassword.currentPassword}</Label>
            <Input
              id="cp-current"
              type="password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-new">{t.changePassword.newPassword}</Label>
            <Input
              id="cp-new"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-confirm">{t.changePassword.confirmPassword}</Label>
            <Input
              id="cp-confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Min. 8 characters · uppercase · number · special character
          </p>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? t.changePassword.saving : t.changePassword.saveVoluntary}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
