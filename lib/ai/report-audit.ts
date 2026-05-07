import { createHash } from 'crypto'

import type { BunkerReport, PhotoItem, StepId, SurveyFormData } from '@/lib/types'

export type AuditSeverity = 'critical' | 'warning' | 'info'

export interface AuditFinding {
  severity: AuditSeverity
  category: string
  step: StepId | null
  field: string | null
  message: string
  suggested_action: string
}

export interface ReportAuditResult {
  readiness_score: number
  can_finalize: boolean
  summary: string
  findings: AuditFinding[]
}

export interface ReportAuditPayload {
  report: {
    id: string
    ref_number: string
    vessel_name: string
    port: string | null
    status: string
  }
  technical_data: Record<string, unknown>
  import_warnings: string[]
  photo_summary: {
    vessel_tanks: number
    barge_tanks: number
    sampling: number
    without_caption: number
  }
  attachments_checked: string[]
  deterministic_findings: AuditFinding[]
}

const TECHNICAL_FIELDS: (keyof SurveyFormData)[] = [
  'ref_number',
  'vessel_name',
  'port',
  'survey_date',
  'flag',
  'port_registry',
  'callsign',
  'imo_number',
  'vessel_type',
  'delivered_year',
  'loa',
  'boarding_date',
  'boarding_time',
  'draft_fore_open',
  'draft_aft_open',
  'list_open',
  'sounding_date_open',
  'sounding_time_start_open',
  'sounding_time_end_open',
  'vessel_tanks_open',
  'logbook_figure',
  'naabsa_figure',
  'difference_open_vessel',
  'engine_room_temp',
  'sea_water_temp',
  'vessel_gravities_open',
  'draft_fore_barge_open',
  'draft_aft_barge_open',
  'list_barge_open',
  'flowmeter_status_open',
  'barge_sounding_date',
  'barge_sounding_time_start',
  'barge_sounding_time_end',
  'barge_tanks_open',
  'barge_inspector_figure_open',
  'surveyor_figure_barge_open',
  'difference_barge_open',
  'barge_temp_method',
  'barge_gravities_open',
  'draft_fore_close',
  'draft_aft_close',
  'list_close',
  'closing_date',
  'closing_time_start',
  'closing_time_end',
  'vessel_tanks_close',
  'initial_quantity',
  'final_quantity',
  'difference_vessel_closing',
  'closing_barge_date',
  'closing_barge_time_start',
  'closing_barge_time_end',
  'barge_tanks_close',
  'barge_inspector_figure_close',
  'surveyor_figure_barge_close',
  'difference_barge_close',
  'flowmeter_close',
  'bdn_figure',
  'surveyor_final_figure',
  'final_difference_mt',
  'final_difference_pct',
  'letter_of_protest',
  'protest_description',
  'second_sounding_done',
  'second_sounding_date',
  'second_sounding_time_range',
  'rob_after_bunkering',
  'rob_trim',
]

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function addFinding(findings: AuditFinding[], finding: AuditFinding) {
  findings.push(finding)
}

export function buildDeterministicFindings(formData: Partial<SurveyFormData>): AuditFinding[] {
  const findings: AuditFinding[] = []

  const required: { field: keyof SurveyFormData; label: string; step: StepId }[] = [
    { field: 'ref_number', label: 'referencia do relatorio', step: 'step1' },
    { field: 'vessel_name', label: 'nome da embarcacao', step: 'step1' },
    { field: 'port', label: 'porto', step: 'step1' },
    { field: 'survey_date', label: 'data da vistoria', step: 'step1' },
    { field: 'imo_number', label: 'IMO', step: 'step3' },
    { field: 'bdn_figure', label: 'BDN Figure', step: 'step7' },
    { field: 'surveyor_final_figure', label: 'Surveyor Final Figure', step: 'step7' },
  ]

  for (const item of required) {
    if (!hasValue(formData[item.field])) {
      addFinding(findings, {
        severity: item.step === 'step7' ? 'critical' : 'warning',
        category: 'campo obrigatório ausente',
        step: item.step,
        field: item.field,
        message: `Falta preencher ${item.label}.`,
        suggested_action: `Abra ${item.step} e preencha ${item.label}.`,
      })
    }
  }

  const photos = formData.photos ?? []
  const vesselPhotos = photos.filter(photo => photo.category === 'vessel_tanks').length
  const bargePhotos = photos.filter(photo => photo.category === 'barge_tanks').length
  const samplingPhotos = photos.filter(photo => photo.category === 'sampling').length
  if (vesselPhotos === 0) {
    addFinding(findings, {
      severity: 'warning',
      category: 'fotos/anexos ausentes',
      step: 'step4',
      field: 'photos',
      message: 'Nenhuma foto de tanques do navio foi anexada.',
      suggested_action: 'Anexe fotos dos tanques do navio na etapa de abertura do navio.',
    })
  }
  if (bargePhotos === 0) {
    addFinding(findings, {
      severity: 'warning',
      category: 'fotos/anexos ausentes',
      step: 'step5',
      field: 'photos',
      message: 'Nenhuma foto de tanques da barcaca foi anexada.',
      suggested_action: 'Anexe fotos dos tanques da barcaca na etapa de abertura da barcaca.',
    })
  }
  if (samplingPhotos === 0) {
    addFinding(findings, {
      severity: 'info',
      category: 'fotos/anexos ausentes',
      step: 'step8',
      field: 'photos',
      message: 'Nenhuma foto de amostragem foi anexada.',
      suggested_action: 'Confirme se a amostragem precisa constar no relatorio fotografico.',
    })
  }

  const checkedAttachments = (formData.attachments ?? []).filter(attachment => attachment.checked)
  if (checkedAttachments.length === 0) {
    addFinding(findings, {
      severity: 'warning',
      category: 'fotos/anexos ausentes',
      step: 'step8',
      field: 'attachments',
      message: 'Nenhum anexo foi marcado no checklist.',
      suggested_action: 'Marque os anexos recebidos ou confirme que o relatorio sera emitido sem anexos.',
    })
  }

  const bdn = numberOrNull(formData.bdn_figure)
  const surveyor = numberOrNull(formData.surveyor_final_figure)
  const diffMt = numberOrNull(formData.final_difference_mt)
  if (bdn !== null && surveyor !== null && diffMt !== null) {
    const expected = Number((surveyor - bdn).toFixed(3))
    if (Math.abs(expected - diffMt) > 0.05) {
      addFinding(findings, {
        severity: 'critical',
        category: 'inconsistência entre números finais',
        step: 'step7',
        field: 'final_difference_mt',
        message: 'A diferenca final em MT nao bate com Surveyor Final Figure menos BDN Figure.',
        suggested_action: `Confira o calculo final. Valor esperado aproximado: ${expected} MT.`,
      })
    }
  }

  return findings
}

export function buildAuditPayload(report: BunkerReport): ReportAuditPayload {
  const formData = report.form_data ?? {}
  const importMetadata = formData as Partial<SurveyFormData> & { import_warnings?: unknown }
  const photos = (formData.photos ?? []) as PhotoItem[]
  const technicalData = Object.fromEntries(
    TECHNICAL_FIELDS
      .filter(field => formData[field] !== undefined)
      .map(field => [field, formData[field]])
  )

  return {
    report: {
      id: report.id,
      ref_number: report.ref_number,
      vessel_name: report.vessel_name,
      port: report.port || null,
      status: report.status,
    },
    technical_data: technicalData,
    import_warnings: Array.isArray(importMetadata.import_warnings) ? importMetadata.import_warnings as string[] : [],
    photo_summary: {
      vessel_tanks: photos.filter(photo => photo.category === 'vessel_tanks').length,
      barge_tanks: photos.filter(photo => photo.category === 'barge_tanks').length,
      sampling: photos.filter(photo => photo.category === 'sampling').length,
      without_caption: photos.filter(photo => !photo.caption?.trim()).length,
    },
    attachments_checked: (formData.attachments ?? [])
      .filter(attachment => attachment.checked)
      .map(attachment => attachment.label),
    deterministic_findings: buildDeterministicFindings(formData),
  }
}

export function hashAuditPayload(payload: ReportAuditPayload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

const AUDIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['readiness_score', 'can_finalize', 'summary', 'findings'],
  properties: {
    readiness_score: { type: 'integer', minimum: 0, maximum: 100 },
    can_finalize: { type: 'boolean' },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'category', 'step', 'field', 'message', 'suggested_action'],
        properties: {
          severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
          category: { type: 'string' },
          step: { type: ['string', 'null'], enum: ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7', 'step8', null] },
          field: { type: ['string', 'null'] },
          message: { type: 'string' },
          suggested_action: { type: 'string' },
        },
      },
    },
  },
}

function extractResponseText(response: { output_text?: string; output?: unknown }) {
  if (typeof response.output_text === 'string') return response.output_text
  if (!Array.isArray(response.output)) return ''

  const chunks: string[] = []
  for (const item of response.output) {
    if (!item || typeof item !== 'object' || !('content' in item) || !Array.isArray(item.content)) continue
    for (const content of item.content) {
      if (!content || typeof content !== 'object') continue
      if ('text' in content && typeof content.text === 'string') chunks.push(content.text)
    }
  }
  return chunks.join('')
}

function normalizeAuditResult(value: unknown): ReportAuditResult {
  if (!value || typeof value !== 'object') throw new Error('Invalid audit response')
  const result = value as Partial<ReportAuditResult>
  return {
    readiness_score: Math.max(0, Math.min(100, Math.round(Number(result.readiness_score ?? 0)))),
    can_finalize: Boolean(result.can_finalize),
    summary: typeof result.summary === 'string' ? result.summary : 'Auditoria concluida.',
    findings: Array.isArray(result.findings) ? result.findings.map((finding) => {
      const item = finding as Partial<AuditFinding>
      return {
        severity: ['critical', 'warning', 'info'].includes(String(item.severity)) ? item.severity as AuditSeverity : 'info',
        category: String(item.category ?? 'analise'),
        step: item.step ?? null,
        field: item.field ?? null,
        message: String(item.message ?? ''),
        suggested_action: String(item.suggested_action ?? ''),
      }
    }) : [],
  }
}

export async function runOpenAiReportAudit(payload: ReportAuditPayload): Promise<{ model: string; result: ReportAuditResult }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const model = process.env.OPENAI_AUDIT_MODEL || 'gpt-5-mini'
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    signal: AbortSignal.timeout(60000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions: [
        'Voce e um auditor operacional de relatorios BQS da NAABSA.',
        'Analise apenas os dados recebidos. Nao invente campos ausentes.',
        'Aponte pendencias, inconsistencias e riscos antes de finalizar o relatorio.',
        'Use portugues do Brasil, tom direto e operacional.',
        'Nao altere dados e nao diga que o relatorio esta juridicamente aprovado.',
      ].join('\n'),
      input: JSON.stringify(payload),
      text: {
        format: {
          type: 'json_schema',
          name: 'report_ai_audit',
          strict: true,
          schema: AUDIT_SCHEMA,
        },
      },
      max_output_tokens: 1800,
    }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `OpenAI audit failed with HTTP ${response.status}`)
  }

  const data = await response.json()
  const outputText = extractResponseText(data)
  if (!outputText) throw new Error('OpenAI audit returned no structured output')

  return {
    model,
    result: normalizeAuditResult(JSON.parse(outputText)),
  }
}
