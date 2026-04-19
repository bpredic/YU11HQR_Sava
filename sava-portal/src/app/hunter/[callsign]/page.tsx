import { getSession } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { HunterStats } from '@/components/HunterStats'

export default async function HunterStatsPage({
  params,
}: {
  params: Promise<{ callsign: string }>
}) {
  const session = await getSession()
  const { callsign } = await params

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader user={session} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <HunterStats callsign={callsign.toUpperCase()} isAdmin={session?.role === 'admin'} />
      </main>
    </div>
  )
}
