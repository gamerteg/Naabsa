import { NextResponse } from 'next/server'

import {
  buildAuditPayload,
  hashAuditPayload,
  runOpenAiReportAudit,
  type ReportAuditResult,
} from '@/lib/ai/report-audit'
import { requireActiveUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BunkerReport, Role } from '@/lib/types'

async function loadReportForAudit(reportId: string, userId: string, role: Role) {
  const admin = createAdminClient()
  const { data: report, error } = await admin
    .from('bunker_reports')
    .select('*, assignments:report_assignments(collaborator_id, sections)')
    .eq('id', reportId)
    .single()

  if (error || !report) {
    return {
      admin,
      response: NextResponse.json({ error: 'Relatorio nao encontrado' }, { status: 404 }),
    }
  }

  const isAssigned =
    role === 'gestor' ||
    report.created_by === userId ||
    report.assignments?.some((assignment: { collaborator_id: string }) => assignment.collaborator_id === userId)

  if (!isAssigned) {
    return {
      admin,
      response: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }),
    }
  }

  return { admin, report: report as BunkerReport }
}

async function loadAuditReviews(admin: ReturnType<typeof createAdminClient>, auditId?: string) {
  if (!auditId) return []
  const { data, error } = await admin
    .from('report_ai_finding_reviews')
    .select('id, audit_id, finding_key, reviewed_by, review_note, created_at')
    .eq('audit_id', auditId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[ai-audit] Failed to load finding reviews:', error.message)
    return []
  }
  return data ?? []
}

async function normalizeStoredAudit(admin: ReturnType<typeof createAdminClient>, audit: Record<string, unknown> | null) {
  if (!audit) return null
  return {
    id: audit.id,
    report_id: audit.report_id,
    user_id: audit.user_id,
    model: audit.model,
    input_hash: audit.input_hash,
    readiness_score: audit.readiness_score,
    can_finalize: audit.can_finalize,
    summary: audit.summary,
    findings: audit.findings,
    reviews: await loadAuditReviews(admin, String(audit.id)),
    created_at: audit.created_at,
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response

  const access = await loadReportForAudit(id, auth.user.id, auth.profile.role)
  if ('response' in access) return access.response

  const { data, error } = await access.admin
    .from('report_ai_audits')
    .select('id, report_id, user_id, model, input_hash, readiness_score, can_finalize, summary, findings, created_at')
    .eq('report_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ audit: await normalizeStoredAudit(access.admin, data) })
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response

  const access = await loadReportForAudit(id, auth.user.id, auth.profile.role)
  if ('response' in access) return access.response

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Auditoria GPT indisponivel: OPENAI_API_KEY nao configurada' },
      { status: 503 }
    )
  }

  const payload = buildAuditPayload(access.report)
  const inputHash = hashAuditPayload(payload)

  let audit: { model: string; result: ReportAuditResult }
  try {
    audit = await runOpenAiReportAudit(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao rodar auditoria GPT'
    console.error('[POST /api/reports/[id]/ai-audit] OpenAI error:', message)
    return NextResponse.json(
      { error: 'Nao foi possivel concluir a auditoria GPT agora. Confira a chave OpenAI, o modelo configurado e tente novamente.' },
      { status: 502 }
    )
  }

  const { data, error } = await access.admin
    .from('report_ai_audits')
    .insert({
      report_id: id,
      user_id: auth.user.id,
      model: audit.model,
      input_hash: inputHash,
      readiness_score: audit.result.readiness_score,
      can_finalize: audit.result.can_finalize,
      summary: audit.result.summary,
      findings: audit.result.findings,
    })
    .select('id, report_id, user_id, model, input_hash, readiness_score, can_finalize, summary, findings, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await access.admin.from('report_activity_log').insert({
    report_id: id,
    user_id: auth.user.id,
    action: 'ai_audit_created',
    details: {
      model: audit.model,
      input_hash: inputHash,
      readiness_score: audit.result.readiness_score,
      can_finalize: audit.result.can_finalize,
      findings_count: audit.result.findings.length,
    },
  })

  return NextResponse.json({ audit: await normalizeStoredAudit(access.admin, data) }, { status: 201 })
}
