import { requireActivePageUser } from '@/lib/server/page-auth'

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  await requireActivePageUser()

  return children
}
