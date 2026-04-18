'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MenuIcon, KeyRoundIcon, LogOutIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
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
  const [cpOpen, setCpOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  async function toggleLocale() {
    await setLocale(locale === 'en' ? 'sr' : 'en')
    router.refresh()
  }

  const flagButton = (
    <button
      onClick={toggleLocale}
      className="hover:opacity-80 transition-opacity px-1"
      aria-label="Switch language"
      title={locale === 'en' ? 'Srpski' : 'English'}
    >
      <img
        src={locale === 'en' ? '/sr_flag.png' : '/us_flag.png'}
        alt={locale === 'en' ? 'Srpski' : 'English'}
        width={24}
        height={16}
        className="inline-block"
      />
    </button>
  )

  return (
    <header className="sava-header text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3 min-w-0">
            <img src="/yu1hqr-logo.png" alt="YU1HQR" height={48} className="h-10 md:h-12 w-auto shrink-0" />
            <div className="min-w-0">
              <div className="text-base md:text-xl font-bold tracking-wide truncate">{t.home.title}</div>
              <div className="text-xs text-sky-200 tracking-widest uppercase hidden sm:block">{t.nav.contestSubtitle}</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {flagButton}

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
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">{t.nav.adminPanel}</Button>
                </Link>
                <Link href="/admin/logs">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">{t.admin.allLogFiles}</Button>
                </Link>
                <Link href="/admin/qsos">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">{t.admin.allQsos}</Button>
                </Link>
                <ChangePasswordDialog role="admin" triggerClassName="text-white hover:bg-white/20 hover:text-white" />
                <Button onClick={handleLogout} variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white">
                  {t.nav.logout}
                </Button>
              </>
            )}

            {user?.role === 'activator' && (
              <>
                <Link href="/activator">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">{t.nav.myLogs}</Button>
                </Link>
                <Link href="/activator/upload">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">{t.nav.upload}</Button>
                </Link>
                <Link href="/activator/qsos">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">{t.nav.allQsos}</Button>
                </Link>
                <span className="text-sky-200 text-sm font-medium px-2">{user.callsign}</span>
                <ChangePasswordDialog role="activator" triggerClassName="text-white hover:bg-white/20 hover:text-white" />
                <Button onClick={handleLogout} variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white">
                  {t.nav.logout}
                </Button>
              </>
            )}
          </nav>

          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            {flagButton}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 hover:text-white"
                    aria-label="Menu"
                  />
                }
              >
                <MenuIcon className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {!user && (
                  <>
                    <DropdownMenuItem render={<Link href="/hunter" />}>
                      {t.nav.hunterLookup}
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/login" />}>
                      {t.nav.activatorLogin}
                    </DropdownMenuItem>
                  </>
                )}

                {user?.role === 'admin' && (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{t.nav.adminPanel}</DropdownMenuLabel>
                      <DropdownMenuItem render={<Link href="/admin" />}>
                        {t.nav.adminPanel}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/admin/logs" />}>
                        {t.admin.allLogFiles}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/admin/qsos" />}>
                        {t.admin.allQsos}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setCpOpen(true)}>
                      <KeyRoundIcon className="size-4" />
                      {t.changePassword.changePasswordNav}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
                      <LogOutIcon className="size-4" />
                      {t.nav.logout}
                    </DropdownMenuItem>
                  </>
                )}

                {user?.role === 'activator' && (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-mono">{user.callsign}</DropdownMenuLabel>
                      <DropdownMenuItem render={<Link href="/activator" />}>
                        {t.nav.myLogs}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/activator/upload" />}>
                        {t.nav.upload}
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/activator/qsos" />}>
                        {t.nav.allQsos}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setCpOpen(true)}>
                      <KeyRoundIcon className="size-4" />
                      {t.changePassword.changePasswordNav}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
                      <LogOutIcon className="size-4" />
                      {t.nav.logout}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="wave-divider -mx-4" />
      </div>

      {/* Change password dialog (mobile-controlled) */}
      {user && (
        <ChangePasswordDialog
          role={user.role as 'admin' | 'activator'}
          open={cpOpen}
          onOpenChange={setCpOpen}
        />
      )}
    </header>
  )
}
