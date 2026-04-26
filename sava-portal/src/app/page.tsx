import { getSession } from '@/lib/auth'
import { getLocale, getTranslations } from '@/lib/i18n'
import { prisma } from '@/lib/db'
import { SiteHeader } from '@/components/SiteHeader'
import { HunterSearch } from '@/components/HunterSearch'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ActivatorGrid } from '@/components/ActivatorGrid'
import { HunterRankings } from '@/components/HunterRankings'

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

type ActivityInfo = {
  isActive: boolean
  band: string
  frequency: number
  mode: string
  startAt: Date
  endAt: Date
}

export default async function HomePage() {
  const session = await getSession()
  const locale = await getLocale()
  const t = getTranslations(locale)

  // Fetch current or next upcoming activity period per activator
  const now = new Date()
  const rawPeriods = await prisma.activityPeriod.findMany({
    where: {
      activator: { callsign: { in: ACTIVATORS.map(a => a.call) } },
      endAt: { gt: now },
    },
    include: { activator: { select: { callsign: true } } },
    orderBy: { startAt: 'asc' },
  })

  const activityMap = new Map<string, ActivityInfo>()
  for (const p of rawPeriods) {
    const call = p.activator.callsign
    if (activityMap.has(call)) continue
    activityMap.set(call, {
      isActive: p.startAt <= now,
      band: p.band,
      frequency: p.frequency,
      mode: p.mode,
      startAt: p.startAt,
      endAt: p.endAt,
    })
  }

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
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-center">{t.home.activatorsPoints}</h2>
          <ActivatorGrid
            activators={ACTIVATORS}
            activity={Array.from(activityMap.entries()).map(([call, info]) => ({
              call,
              info: { ...info, startAt: info.startAt.toISOString(), endAt: info.endAt.toISOString() },
            }))}
            t={{ pt: t.home.pt, pts: t.home.pts, activeNow: t.home.activeNow, activeUntil: t.home.activeUntil, nextActivation: t.home.nextActivation }}
          />
        </section>

        {/* Hunter rankings */}
        <section className="max-w-2xl mx-auto">
          <HunterRankings />
        </section>
      </main>

      <footer className="sava-header text-white/70 text-center py-4 text-sm mt-8">
        {t.home.footer}
      </footer>
    </div>
  )
}
