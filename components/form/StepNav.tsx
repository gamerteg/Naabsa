'use client'
import { CheckCircle, Lock } from 'lucide-react'
import type { StepId, SurveyFormData } from '@/lib/types'
import { STEP_LABELS } from '@/lib/types'
import { isReviewStepComplete, REVIEW_GROUPS } from '@/lib/report-ui'
import { useReport } from '@/contexts/ReportContext'
import { useToast } from '@/components/ui/ToastProvider'

export function StepNav() {
  const { currentStep, setCurrentStep, assignedSections, isGestor, formData } = useReport()
  const toast = useToast()

  function handleClick(step: StepId) {
    const isAssigned = isGestor || assignedSections.includes(step)
    if (!isAssigned) {
      toast('info', 'Este bloco esta com outro responsavel')
      return
    }
    setCurrentStep(step)
  }

  return (
    <nav className="review-nav" aria-label="Checklist de revisao">
      <div className="review-nav-heading">
        <span>Checklist</span>
        <strong>Revisao do relatorio</strong>
      </div>

      {REVIEW_GROUPS.map((group) => (
        <div className="review-group" key={group.title}>
          <div className="review-group-title">{group.title}</div>
          {group.steps.map((step) => {
            const isActive = currentStep === step
            const isAssigned = isGestor || assignedSections.includes(step)
            const complete = isReviewStepComplete(step, formData as Partial<SurveyFormData>)

            return (
              <button
                key={step}
                className={`review-step ${isActive ? 'active' : ''} ${complete ? 'complete' : ''} ${!isAssigned ? 'locked' : ''}`}
                onClick={() => handleClick(step)}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`${STEP_LABELS[step]}${!isAssigned ? ' bloqueado' : ''}`}
              >
                <span className="review-step-icon">
                  {!isAssigned ? <Lock size={11} /> : complete ? <CheckCircle size={12} /> : null}
                </span>
                <span>{STEP_LABELS[step]}</span>
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
