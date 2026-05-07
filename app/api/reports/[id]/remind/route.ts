import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveUser } from '@/lib/server/auth'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser(['gestor'])
  if ('response' in auth) return auth.response
  const { user } = auth
  const admin = createAdminClient()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const collaboratorId = body.collaborator_id
  if (typeof collaboratorId !== 'string' || collaboratorId.trim().length === 0) {
    return NextResponse.json({ error: 'collaborator_id is required' }, { status: 400 })
  }

  const { data: report, error: reportError } = await admin
    .from('bunker_reports')
    .select('id, vessel_name')
    .eq('id', id)
    .single()

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const { data: assignment } = await admin
    .from('report_assignments')
    .select('id')
    .eq('report_id', id)
    .eq('collaborator_id', collaboratorId)
    .maybeSingle()

  if (!assignment) {
    return NextResponse.json({ error: 'Collaborator is not assigned to this report' }, { status: 400 })
  }

  const { error } = await admin.from('notifications').insert({
    user_id: collaboratorId,
    report_id: id,
    type: 'reminder',
    message: `Reminder: Report ${report.vessel_name} has had no activity for 48h`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('report_activity_log').insert({
    report_id: id,
    user_id: user.id,
    action: 'reminder_sent',
    details: { collaborator_id: collaboratorId },
  })

  return NextResponse.json({ success: true })
}
