'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MenuIcon, KeyRoundIcon, LogOutIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog'
import { ClearDatabaseButton } from '@/components/ClearDatabaseButton'
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
  const [clearDbOpen, setClearDbOpen] = useState(false)

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
    <header className="sava-header text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2 min-w-0">
            <img src="/yu1hqr-logo.png" alt="YU1HQR" height={28} className="h-6 md:h-7 w-auto shrink-0" />
            <div className="min-w-0">
              <div className="text-sm md:text-base font-bold tracking-wide truncate">{t.home.title}</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {flagButton}

            <Link href="/on-air">
              <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse mr-1.5" />
                {t.onAir.navLink}
              </Button>
            </Link>

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
                <ClearDatabaseButton className="border-white/30 bg-white/10 hover:bg-white/20" />
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
                <Link href="/activator/activity">
                  <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">{t.nav.activity}</Button>
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
                <DropdownMenuItem render={<Link href="/on-air" />}>
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1" />
                  {t.onAir.navLink}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
                    <DropdownMenuItem variant="destructive" onClick={() => setClearDbOpen(true)}>
                      <Trash2Icon className="size-4" />
                      {t.admin.clearDatabase}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCpOpen(true)}>
                      <KeyRoundIcon className="size-4" />
                      {t.changePassword.changePasswordNav}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={handleLogout}>
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
                      <DropdownMenuItem render={<Link href="/activator/activity" />}>
                        {t.nav.activity}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setCpOpen(true)}>
                      <KeyRoundIcon className="size-4" />
                      {t.changePassword.changePasswordNav}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={handleLogout}>
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
      {user?.role === 'admin' && (
        <ClearDatabaseButton open={clearDbOpen} onOpenChange={setClearDbOpen} />
      )}
    </header>
  )
}
