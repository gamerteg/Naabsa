import { NextResponse } from 'next/server'

import { parseBqsWorkbook } from '@/lib/import/bqs-xlsx'
import { requireActiveUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response
  const { user } = auth

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'An .xlsx file is required' }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return NextResponse.json({ error: 'Only .xlsx files are supported' }, { status: 400 })
  }

  let parsed: Awaited<ReturnType<typeof parseBqsWorkbook>>
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    parsed = await parseBqsWorkbook(buffer)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse spreadsheet'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: report, error } = await admin
    .from('bunker_reports')
    .insert({
      ref_number: parsed.refNumber,
      vessel_name: parsed.vesselName,
      port: parsed.port,
      created_by: user.id,
      status: 'draft',
      form_data: {
        ...parsed.formData,
        import_warnings: parsed.warnings,
        imported_file_name: file.name,
      },
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/reports/import] Insert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await admin.from('report_activity_log').insert({
    report_id: report.id,
    user_id: user.id,
    action: 'report_imported',
    details: {
      file_name: file.name,
      warnings: parsed.warnings,
    },
  })

  return NextResponse.json({ report, warnings: parsed.warnings }, { status: 201 })
}
