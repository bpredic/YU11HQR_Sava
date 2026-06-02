import type { Metadata } from 'next'
import { getSession } from '@/lib/auth'
import { getLocale, getTranslations } from '@/lib/i18n'
import { SiteHeader } from '@/components/SiteHeader'
import { OnAirTable } from '@/components/OnAirTable'
import { DxSpotsWidget } from '@/components/DxSpotsWidget'

export const metadata: Metadata = { title: 'On the Air – Sava River Days 2026' }

export default async function OnAirPage() {
  const session = await getSession()
  const locale = await getLocale()
  const t = getTranslations(locale)

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader user={session} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">{t.onAir.pageTitle}</h1>
          <p className="text-muted-foreground text-sm">{t.onAir.pageSubtitle}</p>
        </div>
        <div className="space-y-8">
          <OnAirTable />
          <DxSpotsWidget />
        </div>
      </main>
    </div>
  )
}
