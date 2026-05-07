import { NextResponse } from 'next/server'

import {
  buildWorkbookSnapshot,
  previewFromAiMapping,
  previewFromBqsTemplate,
  previewFromNaabsaSurveyTemplate,
  previewFromSavedTemplate,
  type SpreadsheetImportTemplate,
} from '@/lib/import/flexible-xlsx'
import { requireActiveUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ImportPreview } from '@/lib/import/flexible-xlsx'

async function logPreview(admin: ReturnType<typeof createAdminClient>, userId: string, fileName: string, preview?: ImportPreview, errorMessage?: string) {
  await admin.from('report_import_logs').insert({
    user_id: userId,
    file_name: fileName,
    source_type: preview?.source_type ?? null,
    confidence_score: preview?.confidence_score ?? null,
    warnings: preview?.warnings ?? [],
    error_message: errorMessage ?? null,
  }).then(({ error }) => {
    if (error) console.error('[import preview log] Insert error:', error.message)
  })
}

export async function POST(request: Request) {
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Dados do upload invalidos.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Envie uma planilha .xlsx.' }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return NextResponse.json({ error: 'Somente arquivos .xlsx sao suportados nesta etapa.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const admin = createAdminClient()

  try {
    const preview = await previewFromBqsTemplate(buffer, file.name)
    await logPreview(admin, auth.user.id, file.name, preview)
    return NextResponse.json({ preview })
  } catch (error) {
    console.info('[import preview] BQS parser fallback:', error instanceof Error ? error.message : 'unknown parser miss')
    // O parser BQS continua sendo o caminho principal. Se nao bater, seguimos para template/IA.
  }

  try {
    const preview = await previewFromNaabsaSurveyTemplate(buffer, file.name)
    if (preview) {
      await logPreview(admin, auth.user.id, file.name, preview)
      return NextResponse.json({ preview })
    }
  } catch (error) {
    console.info('[import preview] NAABSA survey parser fallback:', error instanceof Error ? error.message : 'unknown parser miss')
  }

  let snapshot: Awaited<ReturnType<typeof buildWorkbookSnapshot>>
  try {
    snapshot = await buildWorkbookSnapshot(buffer)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nao foi possivel ler a planilha.'
    await logPreview(admin, auth.user.id, file.name, undefined, message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { data: template } = await admin
    .from('spreadsheet_import_templates')
    .select('id, name, source_signature, mapping')
    .eq('source_signature', snapshot.signature)
    .maybeSingle()

  if (template) {
    const preview = previewFromSavedTemplate(snapshot, file.name, template as SpreadsheetImportTemplate)
    await logPreview(admin, auth.user.id, file.name, preview)
    return NextResponse.json({ preview })
  }

  try {
    const preview = await previewFromAiMapping(snapshot, file.name)
    await logPreview(admin, auth.user.id, file.name, preview)
    return NextResponse.json({ preview })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nao foi possivel criar a previa com IA.'
    await logPreview(admin, auth.user.id, file.name, undefined, message)
    return NextResponse.json({
      error: message,
      details: 'O modelo BQS conhecido continua funcionando. Para planilhas diferentes, configure OPENAI_API_KEY e rode a migration de importacao flexivel.',
    }, { status: 422 })
  }
}
