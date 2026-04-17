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

type Activator = {
  id: number
  callsign: string
  email: string
  createdAt: string
}

export function AdminActivators() {
  const [activators, setActivators] = useState<Activator[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [callsign, setCallsign] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [resetState, setResetState] = useState<{ id: number | null; password: string | null; resetting: number | null }>({
    id: null, password: null, resetting: null,
  })

  const fetchActivators = useCallback(async () => {
    const res = await fetch('/api/admin/activators')
    const data = await res.json()
    setActivators(data)
    setLoading(false)
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
        toast.error(data.error ?? 'Failed to create activator')
        return
      }
      toast.success(`Activator ${data.callsign} created successfully`)
      setNewPassword(data.tempPassword)
      setCallsign('')
      setEmail('')
      fetchActivators()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number, cs: string) {
    if (!confirm(`Delete activator ${cs}? This will also delete all their log files and QSOs.`)) return
    const res = await fetch(`/api/admin/activators/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(`Activator ${cs} deleted`)
      fetchActivators()
    } else {
      toast.error('Failed to delete activator')
    }
  }

  async function handleResetPassword(id: number, cs: string) {
    if (!confirm(`Reset password for ${cs}? A new password will be generated and emailed to the registered address.`)) return
    setResetState(s => ({ ...s, resetting: id }))
    try {
      const res = await fetch(`/api/admin/activators/${id}/reset-password`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to reset password')
        return
      }
      setResetState({ id, password: data.tempPassword, resetting: null })
    } finally {
      setResetState(s => ({ ...s, resetting: null }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {activators.length} activator{activators.length !== 1 ? 's' : ''} registered
        </p>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setNewPassword(null) }}>
          <DialogTrigger render={<Button />}>
            Add Activator
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Activator</DialogTitle>
            </DialogHeader>
            {newPassword ? (
              <div className="space-y-4">
                <Alert className="text-sm">
                  <p className="font-semibold mb-1">Activator created successfully!</p>
                  <p>Temporary password: <code className="bg-muted px-1 rounded font-mono">{newPassword}</code></p>
                  <p className="text-muted-foreground text-xs mt-1">
                    A welcome email has been sent. Share this password with the activator if email is not configured.
                  </p>
                </Alert>
                <Button className="w-full" onClick={() => { setOpen(false); setNewPassword(null) }}>
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="cs">Callsign</Label>
                  <Input
                    id="cs"
                    placeholder="YU1ABC"
                    value={callsign}
                    onChange={e => setCallsign(e.target.value.toUpperCase())}
                    className="font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="em">Email</Label>
                  <Input
                    id="em"
                    type="email"
                    placeholder="activator@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Account & Send Email'}
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
            <DialogTitle>Password Reset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="text-sm">
              <p className="font-semibold mb-1">Password reset successfully!</p>
              <p>New password: <code className="bg-muted px-1 rounded font-mono">{resetState.password}</code></p>
              <p className="text-muted-foreground text-xs mt-1">
                A notification email has been sent. Share this password manually if email is not configured.
              </p>
            </Alert>
            <Button className="w-full" onClick={() => setResetState({ id: null, password: null, resetting: null })}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered Activators</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : activators.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No activators registered yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Callsign</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activators.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">{a.callsign}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{a.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={resetState.resetting === a.id}
                          onClick={() => handleResetPassword(a.id, a.callsign)}
                        >
                          {resetState.resetting === a.id ? 'Resetting…' : 'Reset Password'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(a.id, a.callsign)}
                        >
                          Delete
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
