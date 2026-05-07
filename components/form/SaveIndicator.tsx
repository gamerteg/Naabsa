'use client'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { useReport } from '@/contexts/ReportContext'

export function SaveIndicator() {
  const { saveStatus, saveNow } = useReport()

  if (saveStatus === 'idle') return (
    <span className="save-indicator idle">
      <CheckCircle size={12} /> Sem alteracoes
    </span>
  )

  if (saveStatus === 'saving') return (
    <span className="save-indicator saving">
      <span className="pulse-dot" /> Salvando...
    </span>
  )

  if (saveStatus === 'saved') return (
    <span className="save-indicator saved">
      <CheckCircle size={12} /> Salvo
    </span>
  )

  return (
    <button className="save-indicator error" onClick={() => saveNow().catch(() => undefined)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
      <AlertCircle size={12} /> Falha ao salvar - tentar novamente
    </button>
  )
}
