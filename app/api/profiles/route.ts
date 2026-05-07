import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveUser } from '@/lib/server/auth'

export async function GET(request: Request) {
  const auth = await requireActiveUser(['gestor'])
  if ('response' in auth) return auth.response

  const { searchParams } = new URL(request.url)
  const roleParam = searchParams.get('role')
  const activeParam = searchParams.get('active')

  const admin = createAdminClient()
  let query = admin
    .from('profiles')
    .select('id, full_name, email, role, is_active, must_change_password, created_at, last_seen_at')
    .order('full_name')

  if (roleParam) {
    const roles = roleParam
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)

    if (roles.length === 1) query = query.eq('role', roles[0])
    if (roles.length > 1) query = query.in('role', roles)
  }

  if (activeParam === 'true') query = query.eq('is_active', true)
  if (activeParam === 'false') query = query.eq('is_active', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
