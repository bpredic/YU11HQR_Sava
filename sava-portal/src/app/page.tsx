import { getSession } from '@/lib/auth'
import { getLocale, getTranslations } from '@/lib/i18n'
import { SiteHeader } from '@/components/SiteHeader'
import { HunterSearch } from '@/components/HunterSearch'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const ACTIVATORS = [
  { call: 'YT1SAVA', points: 6 },
  { call: 'YU1HQR', points: 2 },
  { call: 'YU1FI', points: 1 }, { call: 'YU1XO', points: 1 }, { call: 'YT1TU', points: 1 },
  { call: 'YU4LUM', points: 1 }, { call: 'YU4URM', points: 1 }, { call: 'YU4CFA', points: 1 },
  { call: 'YU4NPV', points: 1 }, { call: 'YU4RDX', points: 1 }, { call: 'YU4BPC', points: 1 },
  { call: 'YU5TM', points: 1 }, { call: 'YU5DR', points: 1 }, { call: 'YT5FDE', points: 1 },
  { call: 'YT5TNM', points: 1 }, { call: 'YT5WA', points: 1 }, { call: 'YT5MM', points: 1 },
  { call: 'YU6DEJ', points: 1 }, { call: 'YU6DMR', points: 1 }, { call: 'YT1T', points: 1 },
]

export default async function HomePage() {
  const session = await getSession()
  const locale = await getLocale()
  const t = getTranslations(locale)

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader user={session} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Hero */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[oklch(0.25_0.09_232)] mb-3">
            {t.home.title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.home.subtitle}
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            {t.home.description('YT1SAVA')}
          </p>
        </section>

        {/* Hunter lookup */}
        <section className="mb-12">
          <Card className="max-w-xl mx-auto border-2 border-[oklch(0.72_0.09_210)]">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4 text-center">{t.home.hunterLookupTitle}</h2>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {t.home.hunterLookupDesc}
              </p>
              <HunterSearch />
            </CardContent>
          </Card>
        </section>

        {/* Contest info */}
        <section className="grid md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-3">{t.home.diplomaConditions}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• {t.home.validQsos}</li>
                <li>• {t.home.minPoints}</li>
                <li>• {t.home.yt1savaRequired}</li>
                <li>• {t.home.maxQso}</li>
                <li>• {t.home.digitalModes}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-3">{t.home.allowedModes}</h3>
              <div className="flex flex-wrap gap-2">
                {['CW', 'SSB', 'FT8', 'FT4', 'FT2', 'FM'].map(m => (
                  <Badge key={m} variant="secondary" className="text-sm">{m}</Badge>
                ))}
              </div>
              <h3 className="font-semibold text-lg mt-4 mb-3">{t.home.aboutTitle}</h3>
              <p className="text-sm text-muted-foreground">
                {t.home.aboutText}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Activators table */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-center">{t.home.activatorsPoints}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-w-4xl mx-auto">
            {ACTIVATORS.map(({ call, points }) => (
              <div
                key={call}
                className="flex items-center justify-between px-3 py-2 rounded-lg border bg-card"
              >
                <span className="font-mono font-medium text-sm">{call}</span>
                <Badge
                  className={
                    points === 6
                      ? 'bg-amber-500 text-white hover:bg-amber-500'
                      : points === 2
                      ? 'bg-sky-600 text-white hover:bg-sky-600'
                      : ''
                  }
                  variant={points === 1 ? 'secondary' : 'default'}
                >
                  {points} {points === 1 ? t.home.pt : t.home.pts}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="sava-header text-white/70 text-center py-4 text-sm mt-8">
        {t.home.footer}
      </footer>
    </div>
  )
}
