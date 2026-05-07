import { redirect } from 'next/navigation'

import { requireActivePageUser } from '@/lib/server/page-auth'

export default async function DashboardPage() {
  const { profile } = await requireActivePageUser()

  redirect(profile.role === 'gestor' ? '/dashboard/gestor' : '/dashboard/colaborador')
}
