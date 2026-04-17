'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import Link from 'next/link'
import { useT } from '@/components/TranslationsProvider'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const t = useT()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Login failed')
        return
      }

      if (data.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/activator')
      }
      router.refresh()
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
          <CardTitle className="text-center">{t.login.cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="text-sm">{error}</Alert>
            )}
            <div className="space-y-1">
              <Label htmlFor="username">{t.login.callsignLabel}</Label>
              <Input
                id="username"
                placeholder={t.login.callsignPlaceholder}
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">{t.login.passwordLabel}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.login.loggingIn : t.login.logIn}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/" className="hover:underline">{t.login.backToHunter}</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
