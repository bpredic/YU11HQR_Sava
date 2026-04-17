import { getSession } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'
import { HunterSearch } from '@/components/HunterSearch'
import { Card, CardContent } from '@/components/ui/card'

export default async function HunterPage() {
  const session = await getSession()

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader user={session} />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-12">
        <Card className="border-2">
          <CardContent className="pt-8 pb-8">
            <h1 className="text-2xl font-bold text-center mb-2">Hunter Callsign Lookup</h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Enter your callsign to see your confirmed QSOs and points
            </p>
            <HunterSearch />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
