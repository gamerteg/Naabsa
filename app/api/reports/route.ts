import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveUser } from '@/lib/server/auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const auth = await requireActiveUser(['gestor'])
  if ('response' in auth) return auth.response

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  // Use admin client to bypass RLS for data queries
  const admin = createAdminClient()
  let query = admin
    .from('bunker_reports')
    .select(`*, assignments:report_assignments(id, collaborator_id, sections, profiles:profiles!collaborator_id(id, full_name))`)
    .order('last_activity_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    console.error('[GET /api/reports] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const auth = await requireActiveUser(['gestor'])
  if ('response' in auth) return auth.response
  const { user } = auth

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { ref_number, vessel_name, port, assignments } = body as {
    ref_number: string
    vessel_name: string
    port: string
    assignments: { step: string; collaborator_id: string }[]
  }

  if (!ref_number || !vessel_name || !Array.isArray(assignments)) {
    return NextResponse.json({ error: 'ref_number, vessel_name and assignments are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create report
  const { data: report, error } = await admin
    .from('bunker_reports')
    .insert({
      ref_number,
      vessel_name,
      port,
      created_by: user.id,
      status: assignments?.some((a: { collaborator_id: string }) => a.collaborator_id !== 'gestor') ? 'in_progress' : 'draft',
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/reports] Insert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create assignments (skip gestor-assigned ones)
  if (assignments?.length > 0) {
    const grouped: Record<string, string[]> = {}
    for (const a of assignments) {
      if (a.collaborator_id === 'gestor' || !a.collaborator_id) continue
      if (!grouped[a.collaborator_id]) grouped[a.collaborator_id] = []
      grouped[a.collaborator_id].push(a.step)
    }

    const assignmentRows = Object.entries(grouped).map(([collaborator_id, sections]) => ({
      report_id: report.id,
      collaborator_id,
      sections,
      assigned_by: user.id,
    }))

    if (assignmentRows.length > 0) {
      const { error: assignErr } = await admin.from('report_assignments').insert(assignmentRows)
      if (assignErr) console.error('[POST /api/reports] Assignment error:', assignErr.message)

      const notifications = assignmentRows.map(a => ({
        user_id: a.collaborator_id,
        report_id: report.id,
        type: 'assignment',
        message: `You have been assigned to report ${vessel_name} — Sections: ${a.sections.join(', ')}`,
      }))
      await admin.from('notifications').insert(notifications)
    }
  }

  // Log activity
  await admin.from('report_activity_log').insert({
    report_id: report.id,
    user_id: user.id,
    action: 'report_created',
    details: { ref_number, vessel_name, port },
  })

  return NextResponse.json(report, { status: 201 })
}
