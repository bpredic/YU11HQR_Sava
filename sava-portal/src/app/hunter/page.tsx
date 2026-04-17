import { getSession } from '@/lib/auth'
import { getLocale, getTranslations } from '@/lib/i18n'
import { SiteHeader } from '@/components/SiteHeader'
import { HunterSearch } from '@/components/HunterSearch'
import { Card, CardContent } from '@/components/ui/card'

export default async function HunterPage() {
  const session = await getSession()
  const locale = await getLocale()
  const t = getTranslations(locale)

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader user={session} />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-12">
        <Card className="border-2">
          <CardContent className="pt-8 pb-8">
            <h1 className="text-2xl font-bold text-center mb-2">{t.hunter.pageTitle}</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {t.hunter.pageDesc}
            </p>
            <HunterSearch />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
