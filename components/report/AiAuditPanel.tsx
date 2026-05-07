'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bot, CheckCircle, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'
import { STEP_LABELS, type ReportAiAudit, type StepId } from '@/lib/types'

interface AiAuditPanelProps {
  reportId: string
  onAuditChange?: (audit: ReportAiAudit | null) => void
  onGoToStep?: (step: StepId) => void
}

const SEVERITY_LABELS = {
  critical: 'Impede emissao',
  warning: 'Conferir',
  info: 'Informativo',
}

const SEVERITY_ORDER = ['critical', 'warning', 'info'] as const

export function AiAuditPanel({ reportId, onAuditChange, onGoToStep }: AiAuditPanelProps) {
  const toast = useToast()
  const [audit, setAudit] = useState<ReportAiAudit | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [reviewingKey, setReviewingKey] = useState('')
  const [error, setError] = useState('')

  const updateAudit = useCallback((nextAudit: ReportAiAudit | null) => {
    setAudit(nextAudit)
    onAuditChange?.(nextAudit)
  }, [onAuditChange])

  const runAudit = useCallback(async () => {
    setRunning(true)
    setError('')
    const res = await fetch(`/api/reports/${reportId}/ai-audit`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setRunning(false)

    if (!res.ok) {
      setError(data.error || 'Auditoria GPT indisponivel no momento.')
      return
    }

    updateAudit(data.audit ?? null)
  }, [reportId, updateAudit])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      const res = await fetch(`/api/reports/${reportId}/ai-audit`)
      const data = await res.json().catch(() => ({}))

      if (!active) return
      if (!res.ok) {
        setError(data.error || 'Nao foi possivel carregar a auditoria GPT.')
        setLoading(false)
        return
      }

      if (data.audit) {
        updateAudit(data.audit)
        setLoading(false)
        return
      }

      setLoading(false)
      await runAudit()
    }

    load()
    return () => {
      active = false
    }
  }, [reportId, runAudit, updateAudit])

  const grouped = useMemo(() => {
    const findings = audit?.findings ?? []
    return SEVERITY_ORDER.map(severity => ({
      severity,
      findings: findings.filter(finding => finding.severity === severity),
    })).filter(group => group.findings.length > 0)
  }, [audit])

  const reviewedKeys = useMemo(() => new Set((audit?.reviews ?? []).map((review) => review.finding_key)), [audit])

  function getFindingKey(index: number, message: string) {
    return audit ? `${audit.id}:${index}:${message.slice(0, 80)}` : ''
  }

  async function markFindingReviewed(index: number, message: string) {
    if (!audit) return
    const key = getFindingKey(index, message)
    setReviewingKey(key)

    const res = await fetch(`/api/reports/${reportId}/ai-audit/findings/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audit_id: audit.id,
        finding_key: key,
        review_note: 'Conferido na revisao operacional.',
      }),
    })
    const data = await res.json().catch(() => ({}))
    setReviewingKey('')

    if (!res.ok) {
      toast('error', data.error || 'Nao foi possivel marcar o achado como conferido')
      return
    }

    updateAudit({
      ...audit,
      reviews: [...(audit.reviews ?? []), data.review],
    })
    toast('success', 'Achado marcado como conferido')
  }

  return (
    <section className="ai-audit-panel">
      <div className="ai-audit-header">
        <div>
          <div className="ops-eyebrow">O que falta para finalizar</div>
          <h2>Checklist inteligente</h2>
          <p>A IA sugere pontos para conferir, sem alterar dados nem bloquear a finalizacao.</p>
        </div>
        <Button variant="secondary" size="sm" loading={running} onClick={runAudit}>
          <RefreshCw size={13} /> Rodar novamente
        </Button>
      </div>

      {loading ? (
        <div className="ai-audit-loading">
          <span className="spinner spinner-blue" /> Carregando auditoria...
        </div>
      ) : running && !audit ? (
        <div className="ai-audit-loading">
          <span className="spinner spinner-blue" /> Rodando auditoria GPT...
        </div>
      ) : error ? (
        <div className="ops-alert warning" style={{ marginBottom: 0 }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      ) : audit ? (
        <>
          <div className="ai-audit-summary">
            <div className={`ai-score ${audit.can_finalize ? 'ok' : 'warn'}`}>
              <strong>{audit.readiness_score}</strong>
              <span>/100</span>
            </div>
            <div>
              <div className="ai-audit-status">
                {audit.can_finalize ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                {audit.can_finalize ? 'Pronto para finalizar, com revisao humana.' : 'Confira os pontos antes de finalizar.'}
              </div>
              <p>{audit.summary}</p>
            </div>
          </div>

          {grouped.length === 0 ? (
            <div className="ai-audit-empty">
              <Bot size={16} /> Nenhuma pendencia relevante encontrada.
            </div>
          ) : (
            <div className="ai-finding-groups">
              {grouped.map(group => (
                <div className={`ai-finding-group ${group.severity}`} key={group.severity}>
                  <div className="ai-finding-group-title">
                    {SEVERITY_LABELS[group.severity]} - {group.findings.length}
                  </div>
                  {group.findings.map((finding, idx) => {
                    const globalIndex = audit.findings.findIndex((item) => item === finding)
                    const key = getFindingKey(globalIndex, finding.message)
                    const reviewed = reviewedKeys.has(key)

                    return (
                      <article className={`ai-finding ${reviewed ? 'reviewed' : ''}`} key={`${group.severity}-${idx}`}>
                        <div>
                          <strong>{finding.message}</strong>
                          <p>{finding.suggested_action}</p>
                          <span>{finding.category}{finding.step ? ` - ${STEP_LABELS[finding.step]}` : ''}{reviewed ? ' - Conferido' : ''}</span>
                        </div>
                        <div className="ai-finding-actions">
                          {finding.step && (
                            <button className="btn btn-ghost btn-sm" onClick={() => onGoToStep?.(finding.step as StepId)}>
                              Ir para etapa
                            </button>
                          )}
                          {!reviewed && (
                            <button className="btn btn-secondary btn-sm" disabled={reviewingKey === key} onClick={() => markFindingReviewed(globalIndex, finding.message)}>
                              Conferido
                            </button>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="ai-audit-empty">
          <Bot size={16} /> Nenhuma auditoria salva ainda. Clique em Rodar novamente.
        </div>
      )}
    </section>
  )
}
