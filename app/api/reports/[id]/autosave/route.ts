import { NextResponse } from 'next/server'

import { normalizeCalculatedFields } from '@/lib/calculations'
import { requireActiveUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role, StepId, SurveyFormData } from '@/lib/types'
import { getAllowedSurveyFields, STEP_FIELDS } from '../route'

type SurveyField = keyof SurveyFormData

async function loadReportAccess(reportId: string, userId: string, role: Role) {
  const admin = createAdminClient()
  const { data: report, error } = await admin
    .from('bunker_reports')
    .select('id, status, created_by, form_data, assignments:report_assignments(collaborator_id, sections)')
    .eq('id', reportId)
    .single()

  if (error || !report) {
    return { admin, response: NextResponse.json({ error: 'Report not found' }, { status: 404 }) }
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.form_data !== null && typeof body.form_data !== 'object') {
    return NextResponse.json({ error: 'form_data must be an object' }, { status: 400 })
  }

  const access = await loadReportAccess(id, auth.user.id, auth.profile.role)
  if ('response' in access) return access.response
  if (!access.isAssigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const submittedFormData = (body.form_data ?? {}) as Partial<SurveyFormData>
  let nextFormData: Partial<SurveyFormData>

  if (auth.profile.role === 'gestor' || access.isCreator) {
    nextFormData = submittedFormData
  } else {
    const allowedFields = getAllowedSurveyFields(access.assignedSections)
    const filteredFormData = Object.fromEntries(
      Object.entries(submittedFormData).filter(([key]) => allowedFields.has(key as SurveyField))
    ) as Partial<SurveyFormData>
    nextFormData = {
      ...((access.report.form_data as Partial<SurveyFormData> | null) ?? {}),
      ...filteredFormData,
    }
  }

  const normalized = normalizeCalculatedFields(nextFormData)
  const { error } = await access.admin
    .from('bunker_reports')
    .update({ form_data: normalized })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await access.admin.from('report_activity_log').insert({
    report_id: id,
    user_id: auth.user.id,
    action: 'report_autosaved',
    details: {
      source: 'autosave_endpoint',
      calculated_fields: ['surveyor_final_figure', 'final_difference_mt', 'final_difference_pct'],
    },
  })

  return NextResponse.json({ success: true })
}
