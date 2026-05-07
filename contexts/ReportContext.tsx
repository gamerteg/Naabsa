'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'
import type { SurveyFormData, StepId, ReportStatus, SaveStatus } from '@/lib/types'
import { DEFAULT_ATTACHMENTS } from '@/lib/types'
import { useAutoSave } from '@/hooks/useAutoSave'

const EDITABLE_STEPS: StepId[] = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7', 'step8']

function resolveAccessibleStep(isGestor: boolean, assignedSections: StepId[], fallback: StepId): StepId {
  if (isGestor) return fallback
  if (assignedSections.includes(fallback)) return fallback
  return EDITABLE_STEPS.find((step) => assignedSections.includes(step)) ?? fallback
}

interface ReportContextValue {
  reportId: string
  vesselName: string
  refNumber: string
  status: ReportStatus
  formData: Partial<SurveyFormData>
  currentStep: StepId
  assignedSections: StepId[]
  saveStatus: SaveStatus
  isGestor: boolean
  setCurrentStep: (s: StepId) => void
  updateFormData: (partial: Partial<SurveyFormData>) => void
  saveNow: () => Promise<void>
}

const ReportContext = createContext<ReportContextValue | null>(null)

interface ReportProviderProps {
  reportId: string
  initialData: Partial<SurveyFormData>
  vesselName: string
  refNumber: string
  status: ReportStatus
  assignedSections: StepId[]
  isGestor: boolean
  children: React.ReactNode
}

export function ReportProvider({
  reportId, initialData, vesselName, refNumber, status,
  assignedSections, isGestor, children
}: ReportProviderProps) {
  const [formData, setFormData] = useState<Partial<SurveyFormData>>({
    attachments: DEFAULT_ATTACHMENTS,
    ...initialData,
  })
  const [requestedStep, setRequestedStep] = useState<StepId>('step1')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const currentStep = resolveAccessibleStep(isGestor, assignedSections, requestedStep)

  async function persistFormData(data: Partial<SurveyFormData>) {
    const res = await fetch(`/api/reports/${reportId}/autosave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form_data: data }),
    })
    if (!res.ok) throw new Error('save failed')
  }

  const { saveNow, markDirty } = useAutoSave({
    data: formData,
    reportId,
    onSave: persistFormData,
    onStatusChange: setSaveStatus,
    debounceMs: 5000,
  })

  const updateFormData = useCallback((partial: Partial<SurveyFormData>) => {
    setFormData(prev => ({ ...prev, ...partial }))
    markDirty()
  }, [markDirty])

  return (
    <ReportContext.Provider value={{
      reportId, vesselName, refNumber, status,
      formData, currentStep, assignedSections, saveStatus, isGestor,
      setCurrentStep: setRequestedStep, updateFormData, saveNow,
    }}>
      {children}
    </ReportContext.Provider>
  )
}

export function useReport() {
  const ctx = useContext(ReportContext)
  if (!ctx) throw new Error('useReport must be used within ReportProvider')
  return ctx
}
