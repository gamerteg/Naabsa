import { NextResponse } from 'next/server'

import { requireActiveUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', auth.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
