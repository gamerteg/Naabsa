import { NextResponse } from 'next/server'

import { requireActiveUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role } from '@/lib/types'

async function canAccessReport(reportId: string, userId: string, role: Role) {
  const admin = createAdminClient()
  const { data: report, error } = await admin
    .from('bunker_reports')
    .select('id, created_by, assignments:report_assignments(collaborator_id)')
    .eq('id', reportId)
    .single()

  if (error || !report) {
    return { admin, response: NextResponse.json({ error: 'Relatorio nao encontrado' }, { status: 404 }) }
  }

  const allowed =
    role === 'gestor' ||
    report.created_by === userId ||
    report.assignments?.some((assignment: { collaborator_id: string }) => assignment.collaborator_id === userId)

  if (!allowed) return { admin, response: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  return { admin }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response

  const access = await canAccessReport(id, auth.user.id, auth.profile.role)
  if ('response' in access) return access.response

  const body = await request.json().catch(() => ({}))
  await access.admin.from('report_activity_log').insert({
    report_id: id,
    user_id: auth.user.id,
    action: 'pdf_generated',
    details: {
      filename: typeof body.filename === 'string' ? body.filename : null,
      overflow_count: typeof body.overflow_count === 'number' ? body.overflow_count : null,
      changed_blocks: typeof body.changed_blocks === 'number' ? body.changed_blocks : null,
    },
  })

  return NextResponse.json({ success: true })
}
