import { NextResponse } from 'next/server'

import { requireActiveUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

function makeTemporaryPassword() {
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
  return `Naabsa#${suffix}1`
}

export async function POST(req: Request) {
  const auth = await requireActiveUser(['gestor'])
  if ('response' in auth) return auth.response

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const userId = body.user_id
  if (typeof userId !== 'string' || userId.length < 10) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const temporaryPassword = makeTemporaryPassword()
  const { error: authError } = await admin.auth.admin.updateUserById(userId, { password: temporaryPassword })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const { error: profileError } = await admin
    .from('profiles')
    .update({ must_change_password: true })
    .eq('id', userId)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  await admin.from('report_activity_log').insert({
    user_id: auth.user.id,
    action: 'temporary_password_reset',
    details: { target_user_id: userId },
  })

  return NextResponse.json({ success: true, temporary_password: temporaryPassword })
}
