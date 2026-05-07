import { NextResponse } from 'next/server'

import { requireActiveUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await requireActiveUser(['gestor'])
  if ('response' in auth) return auth.response

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('report_import_logs')
    .select('id, report_id, user_id, file_name, source_type, confidence_score, warnings, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data ?? [] })
}
