import { NextResponse } from 'next/server'

import { requireActiveUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { StepId } from '@/lib/types'
import { STEP_FIELDS } from '../route'

const STEP_IDS = new Set(Object.keys(STEP_FIELDS) as StepId[])

type AssignmentInput = {
  collaborator_id: string
  sections: StepId[]
}

function normalizeAssignments(value: unknown): AssignmentInput[] | null {
  if (!Array.isArray(value)) return null
  const normalized: AssignmentInput[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const candidate = item as { collaborator_id?: unknown; sections?: unknown }
    if (typeof candidate.collaborator_id !== 'string') return null
    if (!Array.isArray(candidate.sections)) return null

    const sections = [...new Set(candidate.sections)]
    if (!sections.every((section): section is StepId => typeof section === 'string' && STEP_IDS.has(section as StepId))) {
      return null
    }

    if (candidate.collaborator_id.trim() && sections.length > 0) {
      normalized.push({ collaborator_id: candidate.collaborator_id, sections })
    }
  }

  return normalized
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser(['gestor'])
  if ('response' in auth) return auth.response

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const assignments = normalizeAssignments(body.assignments)
  if (!assignments) {
    return NextResponse.json({ error: 'assignments must contain collaborator_id and valid sections' }, { status: 400 })
  }

  const admin = createAdminClient()
  const collaboratorIds = [...new Set(assignments.map((assignment) => assignment.collaborator_id))]

  if (collaboratorIds.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, full_name, is_active, role')
      .in('id', collaboratorIds)

    if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 })

    const validIds = new Set((profiles ?? []).filter((profile) => profile.is_active).map((profile) => profile.id))
    const invalidIds = collaboratorIds.filter((collaboratorId) => !validIds.has(collaboratorId))
    if (invalidIds.length > 0) {
      return NextResponse.json({ error: 'Every collaborator must be an active profile', invalid_ids: invalidIds }, { status: 400 })
    }
  }

  const { data: current } = await admin
    .from('report_assignments')
    .select('collaborator_id, sections')
    .eq('report_id', id)

  const { error: deleteError } = await admin
    .from('report_assignments')
    .delete()
    .eq('report_id', id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  if (assignments.length > 0) {
    const { error: insertError } = await admin.from('report_assignments').insert(
      assignments.map((assignment) => ({
        report_id: id,
        collaborator_id: assignment.collaborator_id,
        sections: assignment.sections,
        assigned_by: auth.user.id,
      }))
    )

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const previousIds = new Set((current ?? []).map((assignment) => assignment.collaborator_id))
  const newAssignments = assignments.filter((assignment) => !previousIds.has(assignment.collaborator_id))
  if (newAssignments.length > 0) {
    await admin.from('notifications').insert(
      newAssignments.map((assignment) => ({
        user_id: assignment.collaborator_id,
        report_id: id,
        type: 'assignment',
        message: `Voce recebeu etapas neste relatorio: ${assignment.sections.join(', ')}`,
      }))
    )
  }

  await admin.from('report_activity_log').insert({
    report_id: id,
    user_id: auth.user.id,
    action: 'assignments_updated',
    details: {
      before: current ?? [],
      after: assignments,
    },
  })

  const { data, error } = await admin
    .from('report_assignments')
    .select('id, report_id, collaborator_id, sections, assigned_at, assigned_by, profiles:profiles!collaborator_id(id, full_name, email, role, is_active)')
    .eq('report_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assignments: data ?? [] })
}
