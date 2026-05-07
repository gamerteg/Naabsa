import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveUser } from '@/lib/server/auth'
import type { StepId } from '@/lib/types'

const STEP_IDS = new Set<StepId>([
  'step1',
  'step2',
  'step3',
  'step4',
  'step5',
  'step6',
  'step7',
  'step8',
])

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

  const section = body.section
  const message = body.message

  if (typeof message !== 'string' || message.trim().length < 3) {
    return NextResponse.json({ error: 'A revision message is required' }, { status: 400 })
  }

  if (section !== null && section !== undefined && (typeof section !== 'string' || !STEP_IDS.has(section as StepId))) {
    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  }

  const { data: report, error: reportError } = await admin
    .from('bunker_reports')
    .select('vessel_name, status')
    .eq('id', id)
    .single()

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (report.status !== 'pending_review') {
    return NextResponse.json({ error: 'Revision requests only apply to reports pending review' }, { status: 409 })
  }

  // Create comment
  const { data: comment, error } = await admin
    .from('report_comments')
    .insert({
      report_id: id,
      author_id: user.id,
      section,
      message: message.trim(),
      type: 'revision_request',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update report status
  await admin.from('bunker_reports').update({ status: 'revision_requested' }).eq('id', id)

  // Get report + assignments for notification
  const { data: assignments } = await admin
    .from('report_assignments')
    .select('collaborator_id')
    .eq('report_id', id)

  // Notify relevant collaborators
  const targets = assignments?.map(a => a.collaborator_id) || []
  if (targets.length > 0) {
    await admin.from('notifications').insert(
      targets.map(uid => ({
        user_id: uid,
        report_id: id,
        type: 'revision_requested',
        message: `Manager requested revision on ${report?.vessel_name} — ${section || 'General'}`,
      }))
    )
  }

  await admin.from('report_activity_log').insert({
    report_id: id,
    user_id: user.id,
    action: 'revision_requested',
    section: typeof section === 'string' ? section : null,
    details: { message: message.trim() },
  })

  return NextResponse.json(comment, { status: 201 })
}
