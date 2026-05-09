'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useT } from '@/components/TranslationsProvider'

function ResetPasswordForm() {
  const t = useT()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError(t.changePassword.mismatch)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        const key = data.error as keyof typeof t.changePassword
        setError(
          key in t.changePassword
            ? String(t.changePassword[key])
            : (data.error === 'invalid_token' ? t.resetPassword.invalidToken : t.resetPassword.error)
        )
        return
      }
      setDone(true)
    } catch {
      setError(t.resetPassword.error)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Alert variant="destructive" className="text-sm">{t.resetPassword.invalidToken}</Alert>
    )
  }

  return done ? (
    <div className="space-y-4">
      <Alert className="text-sm">{t.resetPassword.success}</Alert>
      <div className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="hover:underline">{t.forgotPassword.backToLogin}</Link>
      </div>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="destructive" className="text-sm">{error}</Alert>}
      <div className="space-y-1">
        <Label htmlFor="password">{t.changePassword.newPassword}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirm">{t.changePassword.confirmPassword}</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading || !password || !confirm}>
        {loading ? t.changePassword.saving : t.resetPassword.setPassword}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  const t = useT()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[oklch(0.25_0.09_232)]">{t.login.title}</h1>
        <p className="text-muted-foreground mt-1">{t.login.subtitle}</p>
      </div>

      <Card className="w-full max-w-md border-2">
        <CardHeader>
          <CardTitle className="text-center">{t.resetPassword.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
