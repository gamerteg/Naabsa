import { NextResponse } from 'next/server'

import { requireActiveUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role } from '@/lib/types'

async function loadAuditAccess(auditId: string, reportId: string, userId: string, role: Role) {
  const admin = createAdminClient()
  const { data: audit, error } = await admin
    .from('report_ai_audits')
    .select('id, report_id')
    .eq('id', auditId)
    .eq('report_id', reportId)
    .single()

  if (error || !audit) {
    return { admin, response: NextResponse.json({ error: 'Auditoria nao encontrada' }, { status: 404 }) }
  }

  const { data: report, error: reportError } = await admin
    .from('bunker_reports')
    .select('id, created_by, assignments:report_assignments(collaborator_id)')
    .eq('id', reportId)
    .single()

  if (reportError || !report) {
    return { admin, response: NextResponse.json({ error: 'Relatorio nao encontrado' }, { status: 404 }) }
  }

  const isAssigned =
    role === 'gestor' ||
    report?.created_by === userId ||
    report?.assignments?.some((assignment: { collaborator_id: string }) => assignment.collaborator_id === userId)

  if (!isAssigned) {
    return { admin, response: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }

  return { admin, audit }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response

  let body: { audit_id?: unknown; finding_key?: unknown; review_note?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
  }

  if (typeof body.audit_id !== 'string' || typeof body.finding_key !== 'string') {
    return NextResponse.json({ error: 'audit_id e finding_key sao obrigatorios' }, { status: 400 })
  }

  const access = await loadAuditAccess(body.audit_id, id, auth.user.id, auth.profile.role)
  if ('response' in access) return access.response

  const { data, error } = await access.admin
    .from('report_ai_finding_reviews')
    .upsert({
      audit_id: body.audit_id,
      finding_key: body.finding_key,
      reviewed_by: auth.user.id,
      review_note: typeof body.review_note === 'string' ? body.review_note : null,
    }, { onConflict: 'audit_id,finding_key' })
    .select('id, audit_id, finding_key, reviewed_by, review_note, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await access.admin.from('report_activity_log').insert({
    report_id: id,
    user_id: auth.user.id,
    action: 'ai_finding_reviewed',
    details: {
      audit_id: body.audit_id,
      finding_key: body.finding_key,
    },
  })

  return NextResponse.json({ review: data }, { status: 201 })
}
