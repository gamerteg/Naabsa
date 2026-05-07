'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, FileDown, Send, Users } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { ReportProvider, useReport } from '@/contexts/ReportContext'
import { AppShell } from '@/components/layout/AppShell'
import { SaveIndicator } from '@/components/form/SaveIndicator'
import { StepNav } from '@/components/form/StepNav'
import { Step1_General } from '@/components/form/steps/Step1_General'
import { Step2_Contacts } from '@/components/form/steps/Step2_Contacts'
import { Step3_Vessel } from '@/components/form/steps/Step3_Vessel'
import { Step4_OpeningVessel } from '@/components/form/steps/Step4_OpeningVessel'
import { Step5_OpeningBarge } from '@/components/form/steps/Step5_OpeningBarge'
import { Step6_Closing } from '@/components/form/steps/Step6_Closing'
import { Step7_FinalFigures } from '@/components/form/steps/Step7_FinalFigures'
import { Step8_Photos } from '@/components/form/steps/Step8_Photos'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/ToastProvider'
import { AiAuditPanel } from '@/components/report/AiAuditPanel'
import { OperationalReadinessPanel } from '@/components/report/OperationalReadinessPanel'
import { getReportProgress } from '@/lib/report-ui'
import { STEP_LABELS, type BunkerReport, type Profile, type ReportAiAudit, type ReportAssignment, type StepId } from '@/lib/types'

const STEPS: StepId[] = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7', 'step8']

const STEP_COMPONENTS: Record<StepId, React.ComponentType> = {
  step1: Step1_General,
  step2: Step2_Contacts,
  step3: Step3_Vessel,
  step4: Step4_OpeningVessel,
  step5: Step5_OpeningBarge,
  step6: Step6_Closing,
  step7: Step7_FinalFigures,
  step8: Step8_Photos,
}

function AssignmentManager({
  reportId,
  assignments,
  collaborators,
  onUpdated,
}: {
  reportId: string
  assignments: ReportAssignment[]
  collaborators: Profile[]
  onUpdated: (assignments: ReportAssignment[]) => void
}) {
  const toast = useToast()
  const [draft, setDraft] = useState<Record<StepId, string>>(() => {
    const initial = {} as Record<StepId, string>
    STEPS.forEach((step) => {
      const owner = assignments.find((assignment) => assignment.sections.includes(step))
      initial[step] = owner?.collaborator_id || ''
    })
    return initial
  })
  const [saving, setSaving] = useState(false)

  async function saveAssignments() {
    const grouped = new Map<string, StepId[]>()
    Object.entries(draft).forEach(([step, collaboratorId]) => {
      if (!collaboratorId) return
      grouped.set(collaboratorId, [...(grouped.get(collaboratorId) ?? []), step as StepId])
    })

    setSaving(true)
    const res = await fetch(`/api/reports/${reportId}/assignments`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignments: Array.from(grouped.entries()).map(([collaborator_id, sections]) => ({ collaborator_id, sections })),
      }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      toast('error', data.error || 'Nao foi possivel atualizar responsaveis')
      return
    }

    onUpdated(data.assignments || [])
    toast('success', 'Responsaveis atualizados')
  }

  return (
    <section className="card-white" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div className="ops-eyebrow">Responsaveis</div>
          <h2 style={{ fontSize: 'var(--text-base)', color: 'var(--navy-900)', textTransform: 'uppercase' }}>Distribuicao por etapa</h2>
        </div>
        <Button variant="secondary" size="sm" loading={saving} onClick={saveAssignments}>
          <Users size={13} /> Salvar responsaveis
        </Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        {STEPS.map((step) => (
          <label key={step} className="form-group" style={{ margin: 0 }}>
            <span className="field-label">{STEP_LABELS[step]}</span>
            <select
              className="field-input"
              value={draft[step] || ''}
              onChange={(event) => setDraft((current) => ({ ...current, [step]: event.target.value }))}
            >
              <option value="">Gestor</option>
              {collaborators.map((collaborator) => (
                <option key={collaborator.id} value={collaborator.id}>{collaborator.full_name}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  )
}

function FormContent({ reportStatus }: { reportStatus: BunkerReport['status'] }) {
  const { currentStep, setCurrentStep, assignedSections, isGestor, saveNow, reportId, formData } = useReport()
  const toast = useToast()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [audit, setAudit] = useState<ReportAiAudit | null>(null)

  const currentIdx = STEPS.indexOf(currentStep)
  const StepComponent = STEP_COMPONENTS[currentStep]

  function getPrevNext(dir: 1 | -1): StepId | null {
    for (let i = currentIdx + dir; i >= 0 && i < STEPS.length; i += dir) {
      if (isGestor || assignedSections.includes(STEPS[i])) return STEPS[i]
    }
    return null
  }

  async function handleFinalizeReport() {
    setSubmitting(true)
    try {
      await saveNow()
    } catch {
      toast('error', 'Salve o relatorio antes de finalizar. O autosave falhou.')
      setSubmitting(false)
      return
    }
    const res = await fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    if (!res.ok) {
      toast('error', 'Nao foi possivel finalizar o relatorio')
      setSubmitting(false)
      return
    }
    toast('success', 'Relatorio finalizado e pronto para PDF')
    router.push('/dashboard')
    setSubmitting(false)
  }

  const prev = getPrevNext(-1)
  const next = getPrevNext(1)

  return (
    <div className="review-layout">
      <StepNav />
      <div className="review-content">
        <div className="review-scroll">
          <OperationalReadinessPanel formData={formData} audit={audit} onGoToStep={setCurrentStep} />
          <AiAuditPanel reportId={reportId} onAuditChange={setAudit} onGoToStep={setCurrentStep} />
          <StepComponent />
        </div>
        <div className="review-footer">
          <div>
            {prev && (
              <Button variant="ghost" onClick={async () => { try { await saveNow(); setCurrentStep(prev) } catch { toast('error', 'Falha ao salvar antes de navegar') } }}>
                <ChevronLeft size={14} /> Voltar
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {reportStatus === 'approved' ? (
              <Link href={`/reports/${reportId}/pdf`} className="btn btn-primary">
                <FileDown size={14} /> Gerar PDF
              </Link>
            ) : next ? (
              <Button variant="secondary" onClick={async () => { try { await saveNow(); setCurrentStep(next) } catch { toast('error', 'Falha ao salvar antes de navegar') } }}>
                Proximo <ChevronRight size={14} />
              </Button>
            ) : (
              <div className="finalize-stack">
                {audit && !audit.can_finalize && (
                  <span className="finalize-warning">Auditoria GPT encontrou pendencias. Finalizacao ainda e permitida.</span>
                )}
                <Button variant="primary" loading={submitting} onClick={handleFinalizeReport}>
                  <Send size={14} /> Finalizar relatorio
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditReportPage({ params }: PageProps) {
  const [report, setReport] = useState<BunkerReport | null>(null)
  const [assignedSections, setAssignedSections] = useState<StepId[]>([])
  const [collaborators, setCollaborators] = useState<Profile[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const { user, profile, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading || !user) return
    params.then(async ({ id }) => {
      const res = await fetch(`/api/reports/${id}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Nao foi possivel carregar o relatorio' }))
        setLoadError(err.error || 'Nao foi possivel carregar o relatorio')
        return
      }
      const data = await res.json()
      setReport(data)
      const myAssignment = data.assignments?.find((a: { collaborator_id: string }) => a.collaborator_id === user.id)
      setAssignedSections(data.created_by === user.id ? STEPS : (myAssignment?.sections || []))
      setLoadError(null)

      if (profile?.role === 'gestor') {
        const colabsRes = await fetch('/api/profiles?role=colaborador&active=true')
        if (colabsRes.ok) setCollaborators(await colabsRes.json())
      }
    })
  }, [user, profile?.role, authLoading, params])

  if (loadError && !report) {
    return (
      <AppShell>
        <div className="card-white" style={{ maxWidth: 560, margin: '56px auto', padding: 28, textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--navy-900)', textTransform: 'uppercase' }}>
            Nao foi possivel abrir o relatorio
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 10 }}>
            {loadError}
          </p>
        </div>
      </AppShell>
    )
  }

  if (authLoading || !report || !profile) {
    return (
      <AppShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 12 }}>
          <span className="spinner spinner-blue" style={{ width: 20, height: 20 }} />
          <span style={{ color: 'var(--text-muted)' }}>Carregando relatorio...</span>
        </div>
      </AppShell>
    )
  }

  const isGestor = profile.role === 'gestor'
  const progress = getReportProgress(report)

  return (
    <AppShell vesselName={report.vessel_name} refNumber={report.ref_number}>
      <ReportProvider
        reportId={report.id}
        initialData={report.form_data || {}}
        vesselName={report.vessel_name}
        refNumber={report.ref_number}
        status={report.status}
        assignedSections={assignedSections}
        isGestor={isGestor}
      >
        {isGestor && (
          <AssignmentManager
            key={JSON.stringify(report.assignments || [])}
            reportId={report.id}
            assignments={report.assignments || []}
            collaborators={collaborators}
            onUpdated={(nextAssignments) => setReport((current) => current ? { ...current, assignments: nextAssignments } : current)}
          />
        )}
        <div className="review-header">
          <div>
            <div className="ops-eyebrow">Revisao operacional</div>
            <h1>{report.vessel_name}</h1>
            <div className="review-subtitle">{report.ref_number} · {report.port || 'Porto nao informado'}</div>
          </div>
          <div className="review-header-side">
            <StatusBadge status={report.status} />
            <div className="review-progress-pill">{progress.completed}/8 blocos conferidos</div>
            <SaveIndicator />
          </div>
        </div>

        <div className="review-workspace">
          <FormContent reportStatus={report.status} />
        </div>
      </ReportProvider>
    </AppShell>
  )
}
