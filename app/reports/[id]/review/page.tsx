'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, ChevronDown, ChevronUp, Clock, FileDown, MessageSquare, RotateCcw } from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { PdfTemplate } from '@/components/pdf/PdfTemplate'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/ToastProvider'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { getOperationalPendingItems } from '@/lib/report-ui'
import { STEP_LABELS, type BunkerReport, type ReportActivityLog, type ReportComment, type StepId } from '@/lib/types'

interface PageProps { params: Promise<{ id: string }> }

const STEPS: StepId[] = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7', 'step8']

export default function ReviewPage({ params }: PageProps) {
  const [report, setReport] = useState<BunkerReport | null>(null)
  const [comments, setComments] = useState<ReportComment[]>([])
  const [activity, setActivity] = useState<ReportActivityLog[]>([])
  const [id, setId] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [approveOpen, setApproveOpen] = useState(false)
  const [revisionStep, setRevisionStep] = useState<StepId | null>(null)
  const [revisionMsg, setRevisionMsg] = useState('')
  const [expandedStep, setExpandedStep] = useState<StepId | null>('step1')
  const [loading, setLoading] = useState(false)
  const { loading: authLoading } = useAuth()
  const [supabase] = useState(() => createClient())
  const toast = useToast()
  const router = useRouter()

  async function reloadReviewData(reportId = id) {
    if (!reportId) return
    const [reportRes, activityRes] = await Promise.all([
      fetch(`/api/reports/${reportId}`),
      fetch(`/api/reports/${reportId}/activity`),
    ])
    const { data: coms } = await supabase
      .from('report_comments')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })

    if (reportRes.ok) setReport(await reportRes.json())
    if (activityRes.ok) setActivity(await activityRes.json())
    setComments(coms || [])
  }

  useEffect(() => {
    if (authLoading) return
    params.then(async ({ id: reportId }) => {
      setId(reportId)
      await reloadReviewData(reportId)
      setPageLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, params])

  async function handleApprove() {
    setLoading(true)
    const res = await fetch(`/api/reports/${id}/approve`, { method: 'POST' })
    setLoading(false)
    if (res.ok) {
      toast('success', 'Report approved successfully')
      setApproveOpen(false)
      router.push('/dashboard/gestor')
    } else {
      toast('error', 'Nao foi possivel finalizar o relatorio')
    }
  }

  async function handleRevision() {
    if (!revisionMsg.trim() || !revisionStep) return
    setLoading(true)
    const res = await fetch(`/api/reports/${id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: revisionStep, message: revisionMsg }),
    })
    setLoading(false)
    if (res.ok) {
      toast('success', 'Revision request sent')
      setRevisionStep(null)
      setRevisionMsg('')
      await reloadReviewData()
    } else {
      toast('error', 'Nao foi possivel enviar a solicitacao')
    }
  }

  async function updateComment(commentId: string, action: 'corrected' | 'resolved' | 'reopened') {
    const res = await fetch(`/api/reports/${id}/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast('error', data.error || 'Nao foi possivel atualizar a revisao')
      return
    }
    toast('success', action === 'resolved' ? 'Comentario resolvido' : action === 'reopened' ? 'Comentario reaberto' : 'Marcado como corrigido')
    await reloadReviewData()
  }

  function stepOpenComments(step: StepId) {
    return comments.filter((comment) => comment.section === step && !comment.resolved)
  }

  function handleDownloadPdf() {
    if (!report) return
    window.open(`/reports/${report.id}/pdf`, '_blank')
  }

  if (authLoading || pageLoading) {
    return (
      <AppShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 12 }}>
          <span className="spinner spinner-blue" style={{ width: 20, height: 20 }} />
          <span style={{ color: 'var(--text-muted)' }}>Carregando relatorio...</span>
        </div>
      </AppShell>
    )
  }

  const pendingItems = getOperationalPendingItems(report?.form_data || {})
  const resolvedComments = comments.filter((comment) => comment.resolved)

  return (
    <AppShell vesselName={report?.vessel_name} refNumber={report?.ref_number}>
      <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 140px)' }}>
        <div className="card-white" style={{ flex: 1, padding: 0, overflowY: 'auto', background: 'var(--bg-elevated)' }}>
          {report && (
            <div style={{ width: 850, maxWidth: '100%', margin: '0 auto', padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div className="ops-eyebrow">Previa oficial</div>
                  <h1 style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {report.vessel_name}
                  </h1>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{report.ref_number} - {report.port || 'Porto nao informado'}</div>
                </div>
                <Button variant="secondary" onClick={handleDownloadPdf}>
                  <FileDown size={14} /> Abrir PDF
                </Button>
              </div>
              <div style={{ transform: 'scale(0.9)', transformOrigin: 'top center', width: 794, margin: '0 auto' }}>
                <PdfTemplate report={report} />
              </div>
            </div>
          )}
        </div>

        <div style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card-white" style={{ padding: 18, flex: 1, overflowY: 'auto' }}>
            <div className="section-title">Pendencias operacionais</div>
            {pendingItems.length === 0 ? (
              <div className="ops-readiness-ok"><CheckCircle size={14} /> Checklist sem pendencias principais.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {pendingItems.slice(0, 5).map((item) => (
                  <div key={item.id} className={`ops-readiness-item ${item.severity}`}>
                    <Clock size={14} />
                    <span><strong>{item.label}</strong><small>{STEP_LABELS[item.step]}</small></span>
                  </div>
                ))}
              </div>
            )}

            <div className="section-title">Review por etapa</div>
            {STEPS.map((step) => {
              const openComments = stepOpenComments(step)
              const isExpanded = expandedStep === step

              return (
                <div key={step} style={{ marginBottom: 8 }}>
                  <button
                    type="button"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: openComments.length ? 'var(--red-100)' : 'var(--bg-surface)', border: `1px solid ${openComments.length ? 'var(--red-border)' : 'var(--border-default)'}`, borderRadius: 3, cursor: 'pointer' }}
                    onClick={() => setExpandedStep(isExpanded ? null : step)}
                    aria-expanded={isExpanded}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: openComments.length ? 'var(--red-600)' : 'var(--navy-700)', fontSize: 'var(--text-sm)' }}>
                      {openComments.length ? <Clock size={14} /> : <CheckCircle size={14} />}
                      {STEP_LABELS[step]}
                    </span>
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '10px 0 2px' }}>
                      {openComments.length === 0 ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => setRevisionStep(step)}>
                          <MessageSquare size={13} /> Solicitar revisao
                        </button>
                      ) : (
                        openComments.map((comment) => (
                          <div key={comment.id} style={{ padding: 10, borderLeft: '3px solid var(--red-600)', background: 'var(--red-100)', marginBottom: 8 }}>
                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{comment.message}</div>
                            {comment.corrected_at && <div style={{ marginTop: 6, color: 'var(--status-success-text)', fontWeight: 700, fontSize: 'var(--text-xs)' }}>Marcado como corrigido</div>}
                            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => updateComment(comment.id, 'corrected')}>Corrigido</button>
                              <button className="btn btn-primary btn-sm" onClick={() => updateComment(comment.id, 'resolved')}>Resolver</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            <div className="section-title" style={{ marginTop: 18 }}>Comentarios resolvidos</div>
            {resolvedComments.length === 0 ? (
              <div className="empty-state">Nenhum comentario resolvido.</div>
            ) : (
              resolvedComments.slice(0, 8).map((comment) => (
                <div key={comment.id} style={{ border: '1px solid var(--border-default)', borderRadius: 3, padding: '8px 10px', marginBottom: 8 }}>
                  <strong>{comment.section ? STEP_LABELS[comment.section] : 'Geral'}</strong>
                  <p style={{ margin: '4px 0 8px', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{comment.message}</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => updateComment(comment.id, 'reopened')}>
                    <RotateCcw size={13} /> Reabrir
                  </button>
                </div>
              ))
            )}

            <div className="section-title" style={{ marginTop: 18 }}>Historico</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activity.slice(0, 12).map((item) => (
                <div key={item.id} style={{ border: '1px solid var(--border-default)', borderRadius: 3, padding: '8px 10px', background: 'var(--bg-surface)' }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--navy-700)' }}>{item.action}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{new Date(item.created_at).toLocaleString()}</div>
                </div>
              ))}
              {activity.length === 0 && <div className="empty-state">Sem historico registrado.</div>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report && report.status !== 'approved' && (
              <>
                <Button variant="secondary" onClick={() => setRevisionStep('step1')}>
                  <MessageSquare size={14} /> Request Revision
                </Button>
                <Button variant="primary" onClick={() => setApproveOpen(true)}>
                  <CheckCircle size={14} /> Approve All
                </Button>
              </>
            )}
            {report?.status === 'approved' && (
              <Button variant="primary" onClick={handleDownloadPdf}>
                <FileDown size={14} /> Download Official PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal open={approveOpen} onClose={() => setApproveOpen(false)} title="Approve Report"
        footer={<>
          <Button variant="ghost" onClick={() => setApproveOpen(false)}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={handleApprove}>Approve Report</Button>
        </>}>
        <p style={{ fontFamily: "'Source Serif 4', serif", color: 'var(--text-secondary)' }}>
          This finalizes the report and makes the PDF available. Pendencias are visible above but do not block finalization.
        </p>
      </Modal>

      <Modal open={!!revisionStep} onClose={() => setRevisionStep(null)} title="Request Revision"
        footer={<>
          <Button variant="ghost" onClick={() => setRevisionStep(null)}>Cancel</Button>
          <Button variant="primary" loading={loading} disabled={!revisionMsg.trim()} onClick={handleRevision}>Send Revision Request</Button>
        </>}>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="field-label">Section</label>
          <select className="field-input" value={revisionStep || ''} onChange={e => setRevisionStep(e.target.value as StepId)} aria-label="Select section">
            {STEPS.map(s => <option key={s} value={s}>{STEP_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="field-label">Message to Collaborator</label>
          <textarea className="field-input serif" rows={4} value={revisionMsg} onChange={e => setRevisionMsg(e.target.value)} placeholder="Describe what needs to be corrected..." />
        </div>
      </Modal>
    </AppShell>
  )
}
