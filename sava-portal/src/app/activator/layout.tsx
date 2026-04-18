import { getSession } from '@/lib/auth'
import { ForceChangePasswordDialog } from '@/components/ForceChangePasswordDialog'

export default async function ActivatorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  return (
    <>
      {children}
      <ForceChangePasswordDialog mustChange={session?.mustChangePassword === true} />
    </>
  )
}
