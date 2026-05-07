import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveUser } from '@/lib/server/auth'

export async function GET() {
  const auth = await requireActiveUser(['colaborador'])
  if ('response' in auth) return auth.response
  const { user } = auth

  const admin = createAdminClient()

  const { data: assignments, error: assignmentsError } = await admin
    .from('report_assignments')
    .select('report_id')
    .eq('collaborator_id', user.id)

  if (assignmentsError) {
    return NextResponse.json({ error: assignmentsError.message }, { status: 500 })
  }

  const reportIds = assignments?.map((assignment) => assignment.report_id) ?? []

  let query = admin
    .from('bunker_reports')
    .select(`*, assignments:report_assignments(id, collaborator_id, sections, profiles:profiles!collaborator_id(id, full_name))`)
    .order('last_activity_at', { ascending: false })

  if (reportIds.length > 0) {
    query = query.or(`created_by.eq.${user.id},id.in.(${reportIds.join(',')})`)
  } else {
    query = query.eq('created_by', user.id)
  }

  const { data: reports, error: reportsError } = await query

  if (reportsError) {
    return NextResponse.json({ error: reportsError.message }, { status: 500 })
  }

  return NextResponse.json(reports ?? [])
}
