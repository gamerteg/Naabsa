import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveUser } from '@/lib/server/auth'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser(['gestor'])
  if ('response' in auth) return auth.response
  const { user } = auth
  const admin = createAdminClient()

  // Get report info
  const { data: report, error: reportError } = await admin
    .from('bunker_reports')
    .select('vessel_name, created_by, status')
    .eq('id', id)
    .single()

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (report.status !== 'pending_review') {
    return NextResponse.json({ error: 'Only reports pending review can be approved' }, { status: 409 })
  }

  // Update status
  const { error } = await admin
    .from('bunker_reports')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: user.id })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify all collaborators assigned to this report
  const { data: assignments } = await admin
    .from('report_assignments')
    .select('collaborator_id')
    .eq('report_id', id)

  const notifTargets = [...new Set([
    ...(assignments?.map(a => a.collaborator_id) || []),
    report?.created_by,
  ].filter(Boolean))]

  if (notifTargets.length > 0) {
    await admin.from('notifications').insert(
      notifTargets.map(uid => ({
        user_id: uid,
        report_id: id,
        type: 'report_approved',
        message: `Report ${report?.vessel_name} has been approved`,
      }))
    )
  }

  await admin.from('report_activity_log').insert({
    report_id: id,
    user_id: user.id,
    action: 'report_approved',
    details: {
      status_before: report.status,
      status_after: 'approved',
      vessel_name: report.vessel_name,
      notified_users: notifTargets,
    },
  })

  return NextResponse.json({ success: true })
}
