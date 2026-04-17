'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { SessionPayload } from '@/lib/auth'
import { useT, useLocale } from '@/components/TranslationsProvider'
import { setLocale } from '@/app/actions/locale'

type Props = {
  user: SessionPayload | null
}

export function SiteHeader({ user }: Props) {
  const router = useRouter()
  const t = useT()
  const locale = useLocale()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  async function toggleLocale() {
    await setLocale(locale === 'en' ? 'sr' : 'en')
    router.refresh()
  }

  return (
    <header className="sava-header text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="group">
            <div className="text-xl font-bold tracking-wide">{t.home.title}</div>
            <div className="text-xs text-sky-200 tracking-widest uppercase">{t.nav.contestSubtitle}</div>
          </Link>

          <nav className="flex items-center gap-3">
            <ThemeToggle />

            <button
              onClick={toggleLocale}
              className="text-xs font-semibold text-sky-200 hover:text-white transition-colors px-1 tabular-nums"
              aria-label="Switch language"
            >
              {locale === 'en' ? 'SR' : 'EN'}
            </button>

            {!user && (
              <>
                <Link href="/hunter">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                    {t.nav.hunterLookup}
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white">
                    {t.nav.activatorLogin}
                  </Button>
                </Link>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <Link href="/admin">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                    {t.nav.adminPanel}
                  </Button>
                </Link>
                <Button onClick={handleLogout} variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white">
                  {t.nav.logout}
                </Button>
              </>
            )}
            {user?.role === 'activator' && (
              <>
                <Link href="/activator">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                    {t.nav.myLogs}
                  </Button>
                </Link>
                <Link href="/activator/upload">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                    {t.nav.upload}
                  </Button>
                </Link>
                <Link href="/activator/qsos">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                    {t.nav.allQsos}
                  </Button>
                </Link>
                <span className="text-sky-200 text-sm font-medium px-2">{user.callsign}</span>
                <Button onClick={handleLogout} variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white">
                  {t.nav.logout}
                </Button>
              </>
            )}
          </nav>
        </div>

        <div className="wave-divider -mx-4" />
      </div>
    </header>
  )
}
