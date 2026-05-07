'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, FileSpreadsheet, Info, RotateCcw, UploadCloud } from 'lucide-react'

import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

type ImportSourceType = 'bqs_template' | 'saved_template' | 'ai_mapping'

interface ImportPreview {
  source_type: ImportSourceType
  confidence_score: number
  form_data: Record<string, unknown>
  field_confidence: Record<string, number>
  warnings: string[]
  template_candidate: {
    signature: string
    template_id?: string
    template_name?: string
    mapping?: Record<string, { sheet: string; row: number; col: number }>
  }
  file_name: string
}

const sourceLabels: Record<ImportSourceType, string> = {
  bqs_template: 'Modelo BQS reconhecido',
  saved_template: 'Modelo aprovado reutilizado',
  ai_mapping: 'Mapeamento por IA',
}

function previewSourceLabel(preview: ImportPreview) {
  if (preview.template_candidate.template_name?.toLowerCase().includes('naabsa survey')) {
    return 'Modelo NAABSA reconhecido'
  }
  return sourceLabels[preview.source_type]
}

const fieldLabels: Record<string, string> = {
  ref_number: 'Referencia',
  vessel_name: 'Embarcacao',
  port: 'Porto',
  survey_date: 'Data da vistoria',
  surveyor_name: 'Surveyor',
  supplier_company: 'Fornecedor',
  bdn_figure: 'BDN',
  surveyor_final_figure: 'Figura final NAABSA',
  final_difference_mt: 'Diferenca final MT',
  rob_after_bunkering: 'ROB apos bunkering',
}

const editablePreviewFields = [
  'ref_number',
  'vessel_name',
  'port',
  'survey_date',
  'surveyor_name',
  'supplier_company',
  'bdn_figure',
  'surveyor_final_figure',
  'rob_after_bunkering',
]

const numericPreviewFields = new Set(['bdn_figure', 'surveyor_final_figure', 'rob_after_bunkering'])

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Nao identificado'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao'
  if (Array.isArray(value)) return `${value.length} itens`
  return String(value)
}

export default function NewReportPage() {
  const router = useRouter()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState('')

  function selectFile(nextFile?: File) {
    setError('')
    setPreview(null)
    if (!nextFile) return
    if (!nextFile.name.toLowerCase().endsWith('.xlsx')) {
      setFile(null)
      setError('Selecione uma planilha .xlsx.')
      return
    }
    setFile(nextFile)
  }

  async function handlePreview() {
    if (!file) {
      setError('Escolha uma planilha .xlsx antes de continuar.')
      return
    }

    setPreviewLoading(true)
    setError('')
    setPreview(null)

    const body = new FormData()
    body.append('file', file)

    const res = await fetch('/api/reports/import/preview', { method: 'POST', body })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(data.error || 'Nao foi possivel gerar a previa da planilha.')
      toast('error', data.error || 'Nao foi possivel gerar a previa')
      setPreviewLoading(false)
      return
    }

    setPreview(data.preview)
    toast('success', 'Previa pronta. Confira os dados antes de criar o relatorio.')
    setPreviewLoading(false)
  }

  async function handleConfirm() {
    if (!preview) return

    setConfirmLoading(true)
    setError('')

    const res = await fetch('/api/reports/import/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preview }),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(data.error || 'Nao foi possivel criar o relatorio.')
      toast('error', data.error || 'Nao foi possivel criar o relatorio')
      setConfirmLoading(false)
      return
    }

    toast('success', 'Relatorio criado. Revise os dados e anexe as fotos.')
    router.push(`/reports/${data.report.id}/edit`)
  }

  const highlightedFields = ['ref_number', 'vessel_name', 'port', 'survey_date', 'surveyor_name', 'bdn_figure', 'surveyor_final_figure']
  const filledFields = preview ? Object.entries(preview.form_data).filter(([, value]) => value !== null && value !== undefined && value !== '') : []
  const uncertainFields = preview
    ? Object.entries(preview.field_confidence)
      .filter(([, confidence]) => confidence < 0.72)
      .map(([field]) => field)
    : []

  function updatePreviewField(field: string, value: string) {
    setPreview((current) => {
      if (!current) return current
      const nextValue = numericPreviewFields.has(field) ? (value === '' ? '' : Number(value)) : value
      return {
        ...current,
        form_data: {
          ...current.form_data,
          [field]: nextValue,
        },
        field_confidence: {
          ...current.field_confidence,
          [field]: value === '' ? 0 : Math.max(current.field_confidence[field] ?? 0.8, 0.8),
        },
      }
    })
  }

  return (
    <AppShell>
      <div className="import-page">
        <section className="ops-hero import-hero">
          <div>
            <div className="ops-eyebrow">Novo relatorio</div>
            <h1>Importar planilha BQS</h1>
            <p>Envie o modelo preenchido. O sistema cria o relatorio e abre a revisao automaticamente.</p>
          </div>
          <div className="import-flow">
            <span>1. Importar</span>
            <span>2. Revisar</span>
            <span>3. Fotos</span>
            <span>4. PDF</span>
          </div>
        </section>

        <section className="import-panel">
          <div
            onClick={() => fileRef.current?.click()}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              selectFile(event.dataTransfer.files[0])
            }}
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDragOver={(event) => event.preventDefault()}
            role="button"
            aria-label="Enviar planilha BQS"
            className={`import-dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={(event) => selectFile(event.target.files?.[0])}
            />
            <div className="import-icon">
              {file ? <FileSpreadsheet size={34} /> : <UploadCloud size={34} />}
            </div>
            <div>
              <h2>{file ? file.name : 'Solte a planilha BQS aqui'}</h2>
              <p>{file ? `${formatFileSize(file.size)} pronto para analise` : 'ou clique para selecionar um arquivo .xlsx'}</p>
            </div>
          </div>

          {file && (
            <div className="import-ready">
              <CheckCircle size={16} />
              <span>Arquivo selecionado. Primeiro vamos mostrar uma previa dos dados encontrados.</span>
            </div>
          )}

          {error && (
            <div className="ops-alert danger">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {preview && (
            <div className="import-preview">
              <div className="import-preview-header">
                <div>
                  <span className="ops-eyebrow">Previa da importacao</span>
                  <h2>{previewSourceLabel(preview)}</h2>
                  <p>{preview.template_candidate.template_name || preview.file_name}</p>
                </div>
                <div className="confidence-meter" aria-label={`Confianca ${preview.confidence_score}%`}>
                  <strong>{preview.confidence_score}%</strong>
                  <span>confianca</span>
                </div>
              </div>

              <div className="preview-main-fields">
                {highlightedFields.map((field) => (
                  <div key={field}>
                    <span>{fieldLabels[field] || field}</span>
                    <strong>{displayValue(preview.form_data[field])}</strong>
                  </div>
                ))}
              </div>

              <div className="preview-edit-fields">
                <div className="preview-edit-title">
                  <strong>Corrigir antes de criar</strong>
                  <span>Campos ajustados aqui ja entram no relatorio.</span>
                </div>
                <div className="preview-edit-grid">
                  {editablePreviewFields.map((field) => (
                    <label key={field}>
                      <span>{fieldLabels[field] || field}</span>
                      <input
                        type={field === 'survey_date' ? 'date' : numericPreviewFields.has(field) ? 'number' : 'text'}
                        value={String(preview.form_data[field] ?? '')}
                        onChange={(event) => updatePreviewField(field, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="preview-summary-grid">
                <div>
                  <span>Campos preenchidos</span>
                  <strong>{filledFields.length}</strong>
                </div>
                <div>
                  <span>Pendencias de confianca</span>
                  <strong>{uncertainFields.length}</strong>
                </div>
                <div>
                  <span>Origem</span>
                  <strong>{preview.source_type === 'ai_mapping' ? 'IA' : 'Modelo'}</strong>
                </div>
              </div>

              {uncertainFields.length > 0 && (
                <div className="ops-alert warning" style={{ marginTop: 16 }}>
                  <Info size={16} />
                  <div>
                    <strong>Campos com baixa confianca</strong>
                    <ul>
                      {uncertainFields.slice(0, 10).map((field) => (
                        <li key={field}>{fieldLabels[field] || field}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {preview && preview.warnings.length > 0 && (
            <div className="ops-alert warning">
              <Info size={16} />
              <div>
                <strong>Pontos para conferir</strong>
                <ul>
                  {preview.warnings.map((warning, idx) => <li key={idx}>{warning}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="import-actions">
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              Escolher arquivo
            </Button>
            {preview ? (
              <>
                <Button variant="secondary" loading={previewLoading} onClick={handlePreview}>
                  <RotateCcw size={14} /> Gerar previa novamente
                </Button>
                <Button variant="primary" loading={confirmLoading} onClick={handleConfirm}>
                  <FileSpreadsheet size={14} /> Criar relatorio e revisar
                </Button>
              </>
            ) : (
              <Button variant="primary" loading={previewLoading} onClick={handlePreview}>
                <FileSpreadsheet size={14} /> Analisar planilha
              </Button>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
