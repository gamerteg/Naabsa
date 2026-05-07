import { requireActivePageUser } from '@/lib/server/page-auth'
import { AppShell } from '@/components/layout/AppShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireActivePageUser()

  return <AppShell>{children}</AppShell>
}
