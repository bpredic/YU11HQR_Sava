import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SiteHeader } from '@/components/SiteHeader'
import { ActivatorDashboard } from '@/components/ActivatorDashboard'

export default async function ActivatorPage() {
  const session = await getSession()
  if (!session || session.role !== 'activator') redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader user={session} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">
          Log Files – <span className="font-mono text-[oklch(0.35_0.10_232)]">{session.callsign}</span>
        </h1>
        <ActivatorDashboard />
      </main>
    </div>
  )
}
