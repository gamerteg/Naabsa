import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveUser } from '@/lib/server/auth'
import { normalizeCalculatedFields } from '@/lib/calculations'
import type { ReportStatus, Role, StepId, SurveyFormData } from '@/lib/types'

const MANAGER_MUTABLE_STATUSES = new Set<ReportStatus>([
  'draft',
  'in_progress',
  'pending_review',
  'approved',
  'archived',
])

const COLLABORATOR_MUTABLE_STATUSES = new Set<ReportStatus>(['pending_review'])
const CREATOR_MUTABLE_STATUSES = new Set<ReportStatus>([
  'draft',
  'in_progress',
  'pending_review',
  'revision_requested',
  'approved',
  'archived',
])

type SurveyField = keyof SurveyFormData

export const STEP_FIELDS: Record<StepId, SurveyField[]> = {
  step1: ['ref_number', 'vessel_name', 'port', 'survey_date', 'cover_photo_url'],
  step2: ['customer_company', 'customer_contact', 'surveyor_company', 'surveyor_name', 'supplier_company', 'supplier_contact', 'vessel_master', 'vessel_chief_engineer'],
  step3: ['flag', 'port_registry', 'callsign', 'imo_number', 'vessel_type', 'delivered_year', 'loa', 'background_text', 'boarding_date', 'boarding_time'],
  step4: ['draft_fore_open', 'draft_aft_open', 'list_open', 'trim_correction_applied', 'sounding_date_open', 'sounding_time_start_open', 'sounding_time_end_open', 'vessel_engineer_open', 'vessel_tanks_open', 'logbook_figure', 'naabsa_figure', 'difference_open_vessel', 'storage_tanks_temp_source', 'service_settling_temp_source', 'overflow_temp_source', 'engine_room_temp', 'sea_water_temp', 'vessel_gravities_open'],
  step5: ['draft_fore_barge_open', 'draft_aft_barge_open', 'list_barge_open', 'flowmeter_status_open', 'barge_sounding_date', 'barge_sounding_time_start', 'barge_sounding_time_end', 'barge_tanks_open', 'barge_inspector_figure_open', 'surveyor_figure_barge_open', 'difference_barge_open', 'barge_temp_method', 'barge_gravities_open'],
  step6: ['draft_fore_close', 'draft_aft_close', 'list_close', 'closing_date', 'closing_time_start', 'closing_time_end', 'vessel_tanks_close', 'initial_quantity', 'final_quantity', 'difference_vessel_closing', 'closing_barge_date', 'closing_barge_time_start', 'closing_barge_time_end', 'barge_tanks_close', 'barge_inspector_figure_close', 'surveyor_figure_barge_close', 'difference_barge_close', 'flowmeter_close'],
  step7: ['bdn_figure', 'surveyor_final_figure', 'final_difference_mt', 'final_difference_pct', 'letter_of_protest', 'protest_description', 'second_sounding_done', 'second_sounding_date', 'second_sounding_time_range', 'rob_after_bunkering', 'rob_trim'],
  step8: ['photos', 'attachments'],
}

export function getAllowedSurveyFields(steps: StepId[]) {
  return new Set<SurveyField>(steps.flatMap((step) => STEP_FIELDS[step] ?? []))
}

async function loadReportAccess(reportId: string, userId: string, role: Role) {
  const admin = createAdminClient()
  const { data: report, error } = await admin
    .from('bunker_reports')
    .select('id, status, created_by, form_data, assignments:report_assignments(collaborator_id, sections)')
    .eq('id', reportId)
    .single()

  if (error || !report) {
    return {
      admin,
      response: NextResponse.json({ error: 'Report not found' }, { status: 404 }),
    }
  }

  const isCreator = report.created_by === userId
  const isAssigned =
    role === 'gestor' ||
    isCreator ||
    report.assignments?.some((assignment: { collaborator_id: string }) => assignment.collaborator_id === userId)

  const assignedSections =
    role === 'gestor' || isCreator
      ? (Object.keys(STEP_FIELDS) as StepId[])
      : report.assignments
          ?.filter((assignment: { collaborator_id: string }) => assignment.collaborator_id === userId)
          .flatMap((assignment: { sections?: StepId[] }) => assignment.sections ?? []) ?? []

  return { admin, report, isAssigned, isCreator, assignedSections }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response
  const { user, profile } = auth

  const access = await loadReportAccess(id, user.id, profile.role)
  if ('response' in access) return access.response
  if (!access.isAssigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await access.admin
    .from('bunker_reports')
    .select(`*, assignments:report_assignments(id, collaborator_id, sections, profiles:profiles!collaborator_id(id, full_name))`)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response
  const { user, profile } = auth

  const access = await loadReportAccess(id, user.id, profile.role)
  if ('response' in access) return access.response
  if (!access.isAssigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const allowed: Record<string, unknown> = {}

  if (profile.role !== 'gestor' && !access.isCreator && !['draft', 'in_progress', 'revision_requested'].includes(access.report.status)) {
    return NextResponse.json({ error: 'Report is locked for collaborator edits' }, { status: 409 })
  }

  if ('form_data' in body) {
    if (body.form_data !== null && typeof body.form_data !== 'object') {
      return NextResponse.json({ error: 'form_data must be an object' }, { status: 400 })
    }

    const submittedFormData = (body.form_data ?? {}) as Partial<SurveyFormData>

    if (profile.role === 'gestor' || access.isCreator) {
      allowed.form_data = normalizeCalculatedFields(submittedFormData)
    } else {
      const allowedFields = getAllowedSurveyFields(access.assignedSections)
      const filteredFormData = Object.fromEntries(
        Object.entries(submittedFormData).filter(([key]) => allowedFields.has(key as SurveyField))
      ) as Partial<SurveyFormData>

      allowed.form_data = normalizeCalculatedFields({
        ...((access.report.form_data as Partial<SurveyFormData> | null) ?? {}),
        ...filteredFormData,
      })
    }
  }

  if ('status' in body) {
    if (typeof body.status !== 'string') {
      return NextResponse.json({ error: 'status must be a string' }, { status: 400 })
    }

    const nextStatus = body.status as ReportStatus
    if (profile.role === 'gestor') {
      if (!MANAGER_MUTABLE_STATUSES.has(nextStatus)) {
        return NextResponse.json({ error: 'Use dedicated endpoints for this status change' }, { status: 400 })
      }
    } else if (access.isCreator) {
      if (!CREATOR_MUTABLE_STATUSES.has(nextStatus)) {
        return NextResponse.json({ error: 'Invalid status change' }, { status: 400 })
      }
    } else if (!COLLABORATOR_MUTABLE_STATUSES.has(nextStatus)) {
      return NextResponse.json({ error: 'Collaborators cannot set this status' }, { status: 403 })
    }

    allowed.status = nextStatus

    if (nextStatus === 'approved') {
      allowed.approved_at = new Date().toISOString()
      allowed.approved_by = user.id
    }
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await access.admin
    .from('bunker_reports')
    .update(allowed)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await access.admin.from('report_activity_log').insert({
    report_id: id,
    user_id: user.id,
    action: 'report_updated',
    details: {
      changed_fields: Object.keys(allowed),
      status_before: access.report.status,
      status_after: allowed.status ?? access.report.status,
      calculated_fields: 'form_data' in allowed ? ['surveyor_final_figure', 'final_difference_mt', 'final_difference_pct'] : [],
    },
  })

  if (allowed.status === 'pending_review' && access.report.created_by && access.report.created_by !== user.id) {
    await access.admin.from('notifications').insert({
      user_id: access.report.created_by,
      report_id: id,
      type: 'submitted_for_review',
      message: `Report ${id} was submitted for review`,
    })
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser(['gestor'])
  if ('response' in auth) return auth.response

  const admin = createAdminClient()
  const { error } = await admin.from('bunker_reports').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
