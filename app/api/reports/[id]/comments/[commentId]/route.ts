import { NextResponse } from 'next/server'

import { requireActiveUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

type CommentAction = 'corrected' | 'resolved' | 'reopened'

function isCommentAction(value: unknown): value is CommentAction {
  return value === 'corrected' || value === 'resolved' || value === 'reopened'
}

async function refreshReportReviewStatus(admin: ReturnType<typeof createAdminClient>, reportId: string) {
  const { data: openComments } = await admin
    .from('report_comments')
    .select('id')
    .eq('report_id', reportId)
    .eq('resolved', false)
    .is('corrected_at', null)
    .limit(1)

  await admin
    .from('bunker_reports')
    .update({ status: openComments && openComments.length > 0 ? 'revision_requested' : 'pending_review' })
    .eq('id', reportId)
    .in('status', ['revision_requested', 'pending_review'])
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isCommentAction(body.action)) {
    return NextResponse.json({ error: 'Invalid comment action' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: report, error: reportError } = await admin
    .from('bunker_reports')
    .select('id, created_by, status, assignments:report_assignments(collaborator_id)')
    .eq('id', id)
    .single()

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const isAssigned = report.assignments?.some((assignment: { collaborator_id: string }) => assignment.collaborator_id === auth.user.id)
  const isCreator = report.created_by === auth.user.id
  const isGestor = auth.profile.role === 'gestor'

  if (!isGestor && !isCreator && !isAssigned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const action = body.action
  if ((action === 'resolved' || action === 'reopened') && !isGestor) {
    return NextResponse.json({ error: 'Only gestores can resolve or reopen revision comments' }, { status: 403 })
  }

  const patch =
    action === 'corrected'
      ? { corrected_at: new Date().toISOString(), corrected_by: auth.user.id }
      : action === 'resolved'
        ? { resolved: true, resolved_at: new Date().toISOString(), resolved_by: auth.user.id, type: 'resolved' }
        : { resolved: false, reopened_at: new Date().toISOString(), resolved_at: null, resolved_by: null, corrected_at: null, corrected_by: null, type: 'revision_request' }

  const { data: comment, error } = await admin
    .from('report_comments')
    .update(patch)
    .eq('id', commentId)
    .eq('report_id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await refreshReportReviewStatus(admin, id)

  await admin.from('report_activity_log').insert({
    report_id: id,
    user_id: auth.user.id,
    action: `revision_${action}`,
    section: comment.section ?? null,
    details: {
      comment_id: commentId,
      message: comment.message,
    },
  })

  return NextResponse.json({ comment })
}
