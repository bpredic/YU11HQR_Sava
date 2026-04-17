import { getSession } from '@/lib/auth'
import { getLocale, getTranslations } from '@/lib/i18n'
import { redirect } from 'next/navigation'
import { SiteHeader } from '@/components/SiteHeader'
import { AdminActivators } from '@/components/AdminActivators'

export default async function AdminPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')

  const locale = await getLocale()
  const t = getTranslations(locale)

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader user={session} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{t.admin.pageTitle}</h1>
        <AdminActivators />
      </main>
    </div>
  )
}
