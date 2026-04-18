'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { useT } from '@/components/TranslationsProvider'
import { Spinner } from '@/components/ui/spinner'

type Activator = {
  id: number
  callsign: string
  email: string
  createdAt: string
  lastLoginAt: string | null
}

type LoginSession = {
  id: number
  loggedInAt: string
  ipAddress: string | null
}

export function AdminActivators() {
  const [activators, setActivators] = useState<Activator[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [sessionsDialog, setSessionsDialog] = useState<{ activator: Activator | null; sessions: LoginSession[]; loading: boolean }>({
    activator: null, sessions: [], loading: false,
  })
  const [callsign, setCallsign] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [resetState, setResetState] = useState<{ id: number | null; password: string | null; resetting: number | null }>({
    id: null, password: null, resetting: null,
  })
  const t = useT()

  const fetchActivators = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/activators')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setActivators(data)
    } catch (err) {
      toast.error(`Failed to load activators: ${err instanceof Error ? err.message : err}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchActivators() }, [fetchActivators])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/activators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callsign, email }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? t.admin.createFailed)
        return
      }
      toast.success(t.admin.activatorCreated(data.callsign))
      setNewPassword(data.tempPassword)
      setCallsign('')
      setEmail('')
      fetchActivators()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number, cs: string) {
    if (!confirm(t.admin.deleteConfirm(cs))) return
    const res = await fetch(`/api/admin/activators/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(t.admin.activatorDeleted(cs))
      fetchActivators()
    } else {
      toast.error(t.admin.deleteFailed)
    }
  }

  async function handleResetPassword(id: number, cs: string) {
    if (!confirm(t.admin.resetConfirm(cs))) return
    setResetState(s => ({ ...s, resetting: id }))
    try {
      const res = await fetch(`/api/admin/activators/${id}/reset-password`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? t.admin.resetFailed)
        return
      }
      setResetState({ id, password: data.tempPassword, resetting: null })
    } finally {
      setResetState(s => ({ ...s, resetting: null }))
    }
  }

  async function openSessions(a: Activator) {
    setSessionsDialog({ activator: a, sessions: [], loading: true })
    try {
      const res = await fetch(`/api/admin/activators/${a.id}/login-sessions`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setSessionsDialog(s => ({ ...s, sessions: data, loading: false }))
    } catch {
      setSessionsDialog(s => ({ ...s, loading: false }))
      toast.error('Failed to load login sessions')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{t.admin.activatorsCount(activators.length)}</p>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setNewPassword(null) }}>
          <DialogTrigger render={<Button />}>
            {t.admin.addActivator}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.admin.addNewActivator}</DialogTitle>
            </DialogHeader>
            {newPassword ? (
              <div className="space-y-4">
                <Alert className="text-sm">
                  <p className="font-semibold mb-1">{t.admin.createdTitle}</p>
                  <p>{t.admin.tempPassword} <code className="bg-muted px-1 rounded font-mono">{newPassword}</code></p>
                  <p className="text-muted-foreground text-xs mt-1">{t.admin.welcomeEmailSent}</p>
                </Alert>
                <Button className="w-full" onClick={() => { setOpen(false); setNewPassword(null) }}>
                  {t.admin.close}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="cs">{t.admin.callsignLabel}</Label>
                  <Input
                    id="cs"
                    placeholder={t.admin.callsignPlaceholder}
                    value={callsign}
                    onChange={e => setCallsign(e.target.value.toUpperCase())}
                    className="font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="em">{t.admin.emailLabel}</Label>
                  <Input
                    id="em"
                    type="email"
                    placeholder={t.admin.emailPlaceholder}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? t.admin.creating : t.admin.createAccount}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Reset password result dialog */}
      <Dialog
        open={resetState.id !== null && resetState.password !== null}
        onOpenChange={v => { if (!v) setResetState({ id: null, password: null, resetting: null }) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.admin.passwordResetTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="text-sm">
              <p className="font-semibold mb-1">{t.admin.passwordResetSuccess}</p>
              <p>{t.admin.newPassword} <code className="bg-muted px-1 rounded font-mono">{resetState.password}</code></p>
              <p className="text-muted-foreground text-xs mt-1">{t.admin.notificationSent}</p>
            </Alert>
            <Button className="w-full" onClick={() => setResetState({ id: null, password: null, resetting: null })}>
              {t.admin.close}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login sessions dialog */}
      <Dialog
        open={sessionsDialog.activator !== null}
        onOpenChange={v => { if (!v) setSessionsDialog({ activator: null, sessions: [], loading: false }) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {sessionsDialog.activator ? t.admin.loginSessionsTitle(sessionsDialog.activator.callsign) : ''}
            </DialogTitle>
          </DialogHeader>
          {sessionsDialog.loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2"><Spinner className="h-4 w-4" />{t.admin.loginSessionsLoading}</div>
          ) : sessionsDialog.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t.admin.loginSessionsEmpty}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t.admin.colLastLogin}</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsDialog.sessions.map((s, i) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                    <TableCell className="text-sm font-mono">
                      {new Date(s.loggedInAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {s.ipAddress ? s.ipAddress.replace(/^::ffff:/i, '') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.admin.registeredActivators}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Spinner className="h-4 w-4" />{t.admin.loading}</div>
          ) : activators.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">{t.admin.noActivators}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.colCallsign}</TableHead>
                  <TableHead>{t.admin.colEmail}</TableHead>
                  <TableHead>{t.admin.colCreated}</TableHead>
                  <TableHead>{t.admin.colLastLogin}</TableHead>
                  <TableHead className="text-right">{t.admin.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activators.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <button onClick={() => openSessions(a)} className="cursor-pointer">
                        <Badge variant="secondary" className="font-mono hover:bg-secondary/80 transition-colors">{a.callsign}</Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{a.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.lastLoginAt
                        ? new Date(a.lastLoginAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={resetState.resetting === a.id}
                          onClick={() => handleResetPassword(a.id, a.callsign)}
                        >
                          {resetState.resetting === a.id ? t.admin.resetting : t.admin.resetPassword}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(a.id, a.callsign)}
                        >
                          {t.admin.delete}
                        </Button>
                      </div>
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
