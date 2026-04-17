'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { SessionPayload } from '@/lib/auth'

type Props = {
  user: SessionPayload | null
}

export function SiteHeader({ user }: Props) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sava-header text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="group">
            <div className="text-xl font-bold tracking-wide">Sava River Days 2026</div>
            <div className="text-xs text-sky-200 tracking-widest uppercase">Amateur Radio Contest</div>
          </Link>

          <nav className="flex items-center gap-3">
            <ThemeToggle />

            {!user && (
              <>
                <Link href="/hunter">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                    Hunter Lookup
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white">
                    Activator Login
                  </Button>
                </Link>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <Link href="/admin">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                    Admin Panel
                  </Button>
                </Link>
                <Button onClick={handleLogout} variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white">
                  Logout
                </Button>
              </>
            )}
            {user?.role === 'activator' && (
              <>
                <Link href="/activator">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                    My Logs
                  </Button>
                </Link>
                <Link href="/activator/upload">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                    Upload
                  </Button>
                </Link>
                <Link href="/activator/qsos">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                    All QSOs
                  </Button>
                </Link>
                <span className="text-sky-200 text-sm font-medium px-2">{user.callsign}</span>
                <Button onClick={handleLogout} variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white">
                  Logout
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
