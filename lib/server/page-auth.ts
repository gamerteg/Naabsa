import { redirect } from 'next/navigation'

import type { Role } from '@/lib/types'
import { createClient } from '@/lib/supabase/server'

export async function requireActivePageUser(allowedRoles?: Role[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, is_active, must_change_password')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) redirect('/login?error=inactive')
  if (profile.must_change_password) redirect('/change-password')

  if (allowedRoles && !allowedRoles.includes(profile.role)) redirect('/dashboard')

  return { user, profile }
}
