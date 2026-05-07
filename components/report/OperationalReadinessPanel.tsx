'use client'

import { AlertTriangle, Camera, CheckCircle, FileText, Gauge, ListChecks } from 'lucide-react'

import { getFormProgress, getOperationalPendingItems } from '@/lib/report-ui'
import { STEP_LABELS, type ReportAiAudit, type StepId, type SurveyFormData } from '@/lib/types'

interface OperationalReadinessPanelProps {
  formData: Partial<SurveyFormData>
  audit: ReportAiAudit | null
  onGoToStep: (step: StepId) => void
}

function findingKey(auditId: string, index: number, message: string) {
  return `${auditId}:${index}:${message.slice(0, 80)}`
}

export function OperationalReadinessPanel({ formData, audit, onGoToStep }: OperationalReadinessPanelProps) {
  const progress = getFormProgress(formData)
  const pending = getOperationalPendingItems(formData)
  const reviewKeys = new Set((audit?.reviews ?? []).map((review) => review.finding_key))
  const openCriticalFindings = (audit?.findings ?? []).filter((finding, index) =>
    finding.severity === 'critical' && !reviewKeys.has(findingKey(audit!.id, index, finding.message))
  )
  const photos = formData.photos ?? []
  const checkedAttachments = (formData.attachments ?? []).filter((attachment) => attachment.checked)
  const nextItem = pending.find((item) => item.severity === 'critical') ?? pending[0]

  return (
    <section className="ops-readiness-panel">
      <div className="ops-readiness-header">
        <div>
          <div className="ops-eyebrow">Pronto para emitir</div>
          <h2>O que falta para finalizar</h2>
          <p>{nextItem ? nextItem.detail : 'Checklist operacional sem pendencias principais.'}</p>
        </div>
        <div className="ops-readiness-score">
          <strong>{progress.percent}%</strong>
          <span>{progress.completed}/8 blocos</span>
        </div>
      </div>

      <div className="ops-readiness-grid">
        <div>
          <ListChecks size={16} />
          <span>Pendencias</span>
          <strong>{pending.length}</strong>
        </div>
        <div>
          <AlertTriangle size={16} />
          <span>Criticas GPT</span>
          <strong>{openCriticalFindings.length}</strong>
        </div>
        <div>
          <Camera size={16} />
          <span>Fotos</span>
          <strong>{Array.isArray(photos) ? photos.length : 0}</strong>
        </div>
        <div>
          <FileText size={16} />
          <span>Anexos</span>
          <strong>{checkedAttachments.length}</strong>
        </div>
      </div>

      {pending.length === 0 && openCriticalFindings.length === 0 ? (
        <div className="ops-readiness-ok">
          <CheckCircle size={16} /> Relatorio pronto para revisao final humana.
        </div>
      ) : (
        <div className="ops-readiness-list">
          {pending.slice(0, 4).map((item) => (
            <button key={item.id} type="button" className={`ops-readiness-item ${item.severity}`} onClick={() => onGoToStep(item.step)}>
              <Gauge size={14} />
              <span>
                <strong>{item.label}</strong>
                <small>{STEP_LABELS[item.step]}</small>
              </span>
            </button>
          ))}
          {openCriticalFindings.slice(0, 3).map((finding, index) => (
            <button
              key={`${finding.message}-${index}`}
              type="button"
              className="ops-readiness-item critical"
              onClick={() => finding.step && onGoToStep(finding.step as StepId)}
            >
              <AlertTriangle size={14} />
              <span>
                <strong>{finding.message}</strong>
                <small>{finding.step ? STEP_LABELS[finding.step] : 'Auditoria GPT'}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
