import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SiteHeader } from '@/components/SiteHeader'
import { LogFileQsos } from '@/components/LogFileQsos'

export default async function AdminLogFilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')

  const { id } = await params

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader user={session} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <LogFileQsos logFileId={parseInt(id, 10)} backHref="/admin/logs" />
      </main>
    </div>
  )
}
