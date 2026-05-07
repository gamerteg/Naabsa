import { NextResponse } from 'next/server'

import { requireActiveUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response

  const admin = createAdminClient()
  const { data: report, error: reportError } = await admin
    .from('bunker_reports')
    .select('id, created_by, assignments:report_assignments(collaborator_id)')
    .eq('id', id)
    .single()

  if (reportError || !report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const allowed =
    auth.profile.role === 'gestor' ||
    report.created_by === auth.user.id ||
    report.assignments?.some((assignment: { collaborator_id: string }) => assignment.collaborator_id === auth.user.id)

  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await admin
    .from('report_activity_log')
    .select('id, report_id, user_id, action, section, details, created_at, user:profiles(id, full_name, email, role)')
    .eq('report_id', id)
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
