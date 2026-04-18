import { getSession } from '@/lib/auth'
import { getLocale, getTranslations } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import { SiteHeader } from '@/components/SiteHeader'
import { ActivityPeriods } from '@/components/ActivityPeriods'

export default async function ActivityPage() {
  const session = await getSession()
  if (!session || session.role !== 'activator') redirect('/login')

  const locale = await getLocale()
  const t = getTranslations(locale)

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader user={session} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t.activity.pageTitle}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t.activity.pageSubtitle}</p>
        </div>
        <ActivityPeriods />
      </main>
    </div>
  )
}
