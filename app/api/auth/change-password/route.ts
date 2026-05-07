import { NextResponse } from 'next/server'

import { requireActiveUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const password = body.password
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error: authError } = await admin.auth.admin.updateUserById(auth.user.id, { password })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const { error: profileError } = await admin
    .from('profiles')
    .update({ must_change_password: false, last_seen_at: new Date().toISOString() })
    .eq('id', auth.user.id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  await admin.from('report_activity_log').insert({
    user_id: auth.user.id,
    action: 'password_changed',
    details: { forced_change: true },
  })

  return NextResponse.json({ success: true })
}
