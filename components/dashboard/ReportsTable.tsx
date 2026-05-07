'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Archive,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileDown,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import type { BunkerReport, Profile, ReportStatus } from '@/lib/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Tooltip } from '@/components/ui/Tooltip'
import {
  formatReportDate,
  getReportNextAction,
  getReportProgress,
  OPERATIONAL_STATUS_LABELS,
} from '@/lib/report-ui'

interface ReportsTableProps {
  reports: BunkerReport[]
  collaborators?: Profile[]
  onApprove?: (id: string) => void
  onArchive?: (id: string) => void
  onReopen?: (id: string) => void
  onDelete?: (id: string) => void
  isGestor?: boolean
}

const STATUS_OPTIONS: ReportStatus[] = ['draft', 'in_progress', 'pending_review', 'revision_requested', 'approved', 'archived']

function formatRelative(date: string) {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Agora'
  if (hours < 24) return `${hours}h atras`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d atras`
  return formatReportDate(date)
}

export function ReportsTable({ reports, collaborators = [], onApprove, onArchive, onReopen, onDelete, isGestor }: ReportsTableProps) {
  const [filterStatus, setFilterStatus] = useState<ReportStatus[]>([])
  const [filterCollaborator, setFilterCollaborator] = useState('')
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  let filtered = reports
  if (search) filtered = filtered.filter(r =>
    r.ref_number.toLowerCase().includes(search.toLowerCase()) ||
    r.vessel_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.port || '').toLowerCase().includes(search.toLowerCase())
  )
  if (filterStatus.length > 0) filtered = filtered.filter(r => filterStatus.includes(r.status))
  if (filterCollaborator) {
    filtered = filtered.filter(r =>
      r.assignments?.some(a => a.collaborator_id === filterCollaborator)
    )
  }
  filtered = [...filtered].sort((a, b) => {
    const da = new Date(a.last_activity_at).getTime()
    const db = new Date(b.last_activity_at).getTime()
    return sortDir === 'desc' ? db - da : da - db
  })

  function toggleStatus(s: ReportStatus) {
    setFilterStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  return (
    <div className="ops-table-wrap">
      <div className="ops-filters">
        <label className="ops-search">
          <Search size={15} />
          <input
            placeholder="Buscar por REF, navio ou porto"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Buscar relatorios"
          />
        </label>
        {isGestor && collaborators.length > 0 && (
          <select
            className="field-input"
            value={filterCollaborator}
            onChange={e => setFilterCollaborator(e.target.value)}
            style={{ width: 190 }}
            aria-label="Filtrar por colaborador"
          >
            <option value="">Todos da equipe</option>
            {collaborators.map(c => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="btn btn-ghost btn-sm"
          aria-label="Ordenar por atividade"
        >
          Atividade {sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>

      <div className="ops-status-tabs" aria-label="Filtros de status">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            className={filterStatus.includes(s) ? 'active' : ''}
            aria-pressed={filterStatus.includes(s)}
          >
            {OPERATIONAL_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state ops-empty">
          <strong>Nenhum relatorio nesta visao.</strong>
          <span>Importe uma planilha BQS ou ajuste os filtros para encontrar outro relatorio.</span>
          <Link href="/reports/new" className="btn btn-primary btn-sm">Importar planilha BQS</Link>
        </div>
      ) : (
        <div className="ops-report-list">
          {filtered.map((report) => {
            const progress = getReportProgress(report)
            const nextAction = getReportNextAction(report)
            const assignees = report.assignments && report.assignments.length > 0
              ? [...new Set(report.assignments.map(a => a.profiles?.full_name).filter(Boolean))].join(', ')
              : 'Sem responsavel'

            return (
              <article key={report.id} className="ops-report-row">
                <div className="ops-report-main">
                  <div className="ops-report-kicker">
                    <span>{report.ref_number}</span>
                    <span>{report.port || 'Porto nao informado'}</span>
                  </div>
                  <h3>{report.vessel_name}</h3>
                  <div className="ops-report-meta">
                    <StatusBadge status={report.status} pulsing={report.status === 'revision_requested'} />
                    <span>{progress.completed}/{progress.total} blocos conferidos</span>
                    <span>Ultima atividade: {formatRelative(report.last_activity_at)}</span>
                    {isGestor && <span>{assignees}</span>}
                  </div>
                  <div className="ops-progress" aria-label={`Progresso ${progress.percent}%`}>
                    <span style={{ width: `${progress.percent}%` }} />
                  </div>
                </div>

                <div className="ops-report-actions">
                  <Link
                    href={nextAction.href}
                    className={`btn btn-sm ${nextAction.tone === 'success' ? 'btn-secondary' : nextAction.tone === 'danger' ? 'btn-destructive' : 'btn-primary'}`}
                  >
                    {nextAction.label}
                  </Link>
                  {isGestor && report.status === 'pending_review' && (
                    <Tooltip content="Finalizar agora">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onApprove?.(report.id)} aria-label={`Finalizar ${report.ref_number}`}>
                        <CheckCircle size={14} />
                      </button>
                    </Tooltip>
                  )}
                  {report.status === 'approved' && (
                    <Tooltip content="Gerar PDF">
                      <Link href={`/reports/${report.id}/pdf`} className="btn btn-ghost btn-icon btn-sm" aria-label={`Gerar PDF ${report.ref_number}`}>
                        <FileDown size={14} />
                      </Link>
                    </Tooltip>
                  )}
                  {isGestor && report.status !== 'archived' && (
                    <Tooltip content="Arquivar">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onArchive?.(report.id)} aria-label={`Arquivar ${report.ref_number}`}>
                        <Archive size={14} />
                      </button>
                    </Tooltip>
                  )}
                  {isGestor && report.status === 'archived' && (
                    <Tooltip content="Reabrir">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onReopen?.(report.id)} aria-label={`Reabrir ${report.ref_number}`}>
                        <RotateCcw size={14} />
                      </button>
                    </Tooltip>
                  )}
                  {isGestor && (
                    <Tooltip content="Excluir">
                      <button className="btn btn-destructive btn-icon btn-sm" onClick={() => onDelete?.(report.id)} aria-label={`Excluir ${report.ref_number}`}>
                        <Trash2 size={14} />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
