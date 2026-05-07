import type { BunkerReport, ReportStatus, StepId, SurveyFormData } from '@/lib/types'

export const OPERATIONAL_STATUS_LABELS: Record<ReportStatus, string> = {
  draft: 'Revisar dados',
  in_progress: 'Em revisao',
  pending_review: 'Pronto para finalizar',
  revision_requested: 'Correcao solicitada',
  approved: 'Finalizado',
  archived: 'Arquivado',
}

export const OPERATIONAL_STATUS_DESCRIPTIONS: Record<ReportStatus, string> = {
  draft: 'Planilha importada; conferir dados e fotos.',
  in_progress: 'Relatorio em ajuste pela equipe.',
  pending_review: 'Dados conferidos; pode ser finalizado.',
  revision_requested: 'Ha pontos devolvidos para correcao.',
  approved: 'PDF liberado para emissao.',
  archived: 'Fora da fila operacional.',
}

export const REVIEW_GROUPS: { title: string; steps: StepId[] }[] = [
  { title: 'Dados importados', steps: ['step1', 'step2', 'step3'] },
  { title: 'Medicoes', steps: ['step4', 'step5', 'step6'] },
  { title: 'Resultado final', steps: ['step7'] },
  { title: 'Fotos e anexos', steps: ['step8'] },
]

const STEP_COMPLETION_CHECKS: Record<StepId, (data: Partial<SurveyFormData>) => boolean> = {
  step1: (data) => Boolean(data.ref_number && data.vessel_name),
  step2: (data) => Boolean(data.customer_company || data.surveyor_name || data.supplier_company),
  step3: (data) => Boolean(data.imo_number || data.vessel_type || data.flag),
  step4: (data) => Array.isArray(data.vessel_tanks_open) && data.vessel_tanks_open.length > 0,
  step5: (data) => Array.isArray(data.barge_tanks_open) && data.barge_tanks_open.length > 0,
  step6: (data) => Array.isArray(data.vessel_tanks_close) && data.vessel_tanks_close.length > 0,
  step7: (data) => Boolean(data.bdn_figure || data.surveyor_final_figure),
  step8: (data) => Array.isArray(data.photos) && data.photos.length > 0,
}

export function isReviewStepComplete(step: StepId, data: Partial<SurveyFormData>) {
  return STEP_COMPLETION_CHECKS[step](data)
}

export function getReportProgress(report: BunkerReport) {
  const completed = Object.keys(STEP_COMPLETION_CHECKS).filter((step) =>
    isReviewStepComplete(step as StepId, report.form_data || {})
  ).length

  return {
    completed,
    total: 8,
    percent: Math.round((completed / 8) * 100),
  }
}

export interface OperationalPendingItem {
  id: string
  label: string
  detail: string
  step: StepId
  severity: 'critical' | 'warning' | 'info'
}

export function getFormProgress(formData: Partial<SurveyFormData>) {
  const completed = Object.keys(STEP_COMPLETION_CHECKS).filter((step) =>
    isReviewStepComplete(step as StepId, formData)
  ).length

  return {
    completed,
    total: 8,
    percent: Math.round((completed / 8) * 100),
  }
}

export function getOperationalPendingItems(formData: Partial<SurveyFormData>): OperationalPendingItem[] {
  const items: OperationalPendingItem[] = []

  if (!formData.ref_number || !formData.vessel_name) {
    items.push({
      id: 'identity',
      label: 'Dados principais incompletos',
      detail: 'Referencia e embarcacao precisam estar conferidas antes da emissao.',
      step: 'step1',
      severity: 'critical',
    })
  }

  if (!formData.survey_date || !formData.port) {
    items.push({
      id: 'date-port',
      label: 'Data ou porto pendente',
      detail: 'Confirme data da vistoria e porto do atendimento.',
      step: 'step1',
      severity: 'warning',
    })
  }

  if (!Array.isArray(formData.vessel_tanks_open) || formData.vessel_tanks_open.length === 0) {
    items.push({
      id: 'vessel-open',
      label: 'Abertura do navio sem tanques',
      detail: 'Revise os dados importados da medicao inicial do navio.',
      step: 'step4',
      severity: 'critical',
    })
  }

  if (!Array.isArray(formData.barge_tanks_open) || formData.barge_tanks_open.length === 0) {
    items.push({
      id: 'barge-open',
      label: 'Abertura da barcaca sem tanques',
      detail: 'Revise os dados importados da medicao inicial da barcaca.',
      step: 'step5',
      severity: 'critical',
    })
  }

  if (!formData.bdn_figure || !formData.surveyor_final_figure) {
    items.push({
      id: 'final-figures',
      label: 'Resultado final incompleto',
      detail: 'BDN e figura final do surveyor precisam ser conferidos.',
      step: 'step7',
      severity: 'critical',
    })
  }

  const photos = formData.photos ?? []
  if (!Array.isArray(photos) || photos.length === 0) {
    items.push({
      id: 'photos',
      label: 'Fotos ausentes',
      detail: 'Anexe fotos antes de finalizar o relatorio.',
      step: 'step8',
      severity: 'warning',
    })
  }

  const checkedAttachments = (formData.attachments ?? []).filter((attachment) => attachment.checked)
  if (checkedAttachments.length === 0) {
    items.push({
      id: 'attachments',
      label: 'Checklist de anexos vazio',
      detail: 'Marque os anexos recebidos ou confirme emissao sem anexos.',
      step: 'step8',
      severity: 'info',
    })
  }

  const importWarnings = (formData as Partial<SurveyFormData> & { import_warnings?: unknown }).import_warnings
  if (Array.isArray(importWarnings) && importWarnings.length > 0) {
    items.push({
      id: 'import-warnings',
      label: 'Pontos herdados da importacao',
      detail: `${importWarnings.length} ponto(s) precisam ser conferidos no relatorio.`,
      step: 'step1',
      severity: 'warning',
    })
  }

  return items
}

export function getReportNextAction(report: BunkerReport) {
  if (report.status === 'approved') {
    return { label: 'Gerar PDF', href: `/reports/${report.id}/pdf`, tone: 'success' as const }
  }
  if (report.status === 'archived') {
    return { label: 'Consultar', href: `/reports/${report.id}/edit`, tone: 'neutral' as const }
  }
  if (report.status === 'pending_review') {
    return { label: 'Finalizar relatorio', href: `/reports/${report.id}/edit`, tone: 'primary' as const }
  }
  if (report.status === 'revision_requested') {
    return { label: 'Corrigir pendencias', href: `/reports/${report.id}/edit`, tone: 'danger' as const }
  }

  const photos = report.form_data?.photos
  if (!Array.isArray(photos) || photos.length === 0) {
    return { label: 'Anexar fotos', href: `/reports/${report.id}/edit`, tone: 'primary' as const }
  }

  return { label: 'Revisar dados', href: `/reports/${report.id}/edit`, tone: 'primary' as const }
}

export function getOperationalBucket(report: BunkerReport) {
  if (report.status === 'approved') return 'Finalizados'
  if (report.status === 'pending_review') return 'Prontos para finalizar'
  if (!Array.isArray(report.form_data?.photos) || report.form_data.photos.length === 0) return 'Aguardando fotos'
  return 'Importados para revisar'
}

export function formatReportDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
