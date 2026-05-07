import { NextResponse } from 'next/server'

import { ensureReportIdentity, type ImportPreview } from '@/lib/import/flexible-xlsx'
import { requireActiveUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeCalculatedFields } from '@/lib/calculations'

function isImportPreview(value: unknown): value is ImportPreview {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { source_type?: unknown; form_data?: unknown; template_candidate?: unknown }
  return (
    (candidate.source_type === 'bqs_template' || candidate.source_type === 'saved_template' || candidate.source_type === 'ai_mapping') &&
    !!candidate.form_data &&
    typeof candidate.form_data === 'object' &&
    !!candidate.template_candidate &&
    typeof candidate.template_candidate === 'object'
  )
}

export async function POST(request: Request) {
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response
  const { user } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalido.' }, { status: 400 })
  }

  const preview = (body as { preview?: unknown }).preview
  if (!isImportPreview(preview)) {
    return NextResponse.json({ error: 'Previa de importacao invalida.' }, { status: 400 })
  }

  const identity = ensureReportIdentity(preview)
  const admin = createAdminClient()

  const { data: report, error } = await admin
    .from('bunker_reports')
    .insert({
      ref_number: identity.refNumber,
      vessel_name: identity.vesselName,
      port: identity.port,
      created_by: user.id,
      status: 'draft',
      import_source_type: preview.source_type,
      import_confidence_score: preview.confidence_score,
      imported_file_name: preview.file_name,
      form_data: normalizeCalculatedFields({
        ...identity.formData,
        import_warnings: preview.warnings,
        imported_file_name: preview.file_name,
        import_source_type: preview.source_type,
        import_confidence_score: preview.confidence_score,
      }),
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/reports/import/confirm] Insert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (preview.source_type === 'ai_mapping' && preview.template_candidate.mapping) {
    const signature = preview.template_candidate.signature
    const mapping = preview.template_candidate.mapping
    const templateName = preview.template_candidate.template_name || `Modelo ${preview.file_name}`

    await admin
      .from('spreadsheet_import_templates')
      .upsert({
        source_signature: signature,
        name: templateName,
        mapping,
        sample_file_name: preview.file_name,
        confidence_score: preview.confidence_score,
        created_by: user.id,
        updated_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      }, { onConflict: 'source_signature' })
  } else if (preview.source_type === 'saved_template' && preview.template_candidate.signature) {
    const { data: existing } = await admin
      .from('spreadsheet_import_templates')
      .select('usage_count')
      .eq('source_signature', preview.template_candidate.signature)
      .maybeSingle()

    await admin
      .from('spreadsheet_import_templates')
      .update({
        usage_count: Number(existing?.usage_count || 0) + 1,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('source_signature', preview.template_candidate.signature)
  }

  await admin.from('report_activity_log').insert({
    report_id: report.id,
    user_id: user.id,
    action: 'report_import_confirmed',
    details: {
      file_name: preview.file_name,
      source_type: preview.source_type,
      confidence_score: preview.confidence_score,
      warnings: preview.warnings,
    },
  })

  await admin.from('report_import_logs').insert({
    report_id: report.id,
    user_id: user.id,
    file_name: preview.file_name,
    source_type: preview.source_type,
    confidence_score: preview.confidence_score,
    warnings: preview.warnings,
    error_message: null,
  }).then(({ error }) => {
    if (error) console.error('[import confirm log] Insert error:', error.message)
  })

  return NextResponse.json({ report, warnings: preview.warnings }, { status: 201 })
}
