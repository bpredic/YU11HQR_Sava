'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useT } from '@/components/TranslationsProvider'

export default function ForgotPasswordPage() {
  const t = useT()
  const [callsign, setCallsign] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callsign }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? t.forgotPassword.error)
        return
      }
      setSubmitted(true)
    } catch {
      setError(t.forgotPassword.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[oklch(0.25_0.09_232)]">{t.login.title}</h1>
        <p className="text-muted-foreground mt-1">{t.login.subtitle}</p>
      </div>

      <Card className="w-full max-w-md border-2">
        <CardHeader>
          <CardTitle className="text-center">{t.forgotPassword.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <Alert className="text-sm">{t.forgotPassword.sentMessage}</Alert>
              <div className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="hover:underline">{t.forgotPassword.backToLogin}</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <Alert variant="destructive" className="text-sm">{error}</Alert>}
              <p className="text-sm text-muted-foreground">{t.forgotPassword.instructions}</p>
              <div className="space-y-1">
                <Label htmlFor="callsign">{t.login.callsignLabel}</Label>
                <Input
                  id="callsign"
                  placeholder={t.forgotPassword.callsignPlaceholder}
                  value={callsign}
                  onChange={e => setCallsign(e.target.value)}
                  autoComplete="username"
                  className="font-mono"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !callsign.trim()}>
                {loading ? t.forgotPassword.sending : t.forgotPassword.sendLink}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="hover:underline">{t.forgotPassword.backToLogin}</Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
