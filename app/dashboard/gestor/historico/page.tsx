'use client'
import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

import { ReportsTable } from '@/components/dashboard/ReportsTable'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'
import type { BunkerReport } from '@/lib/types'

interface ImportLog {
  id: string
  report_id?: string | null
  file_name: string
  source_type?: string | null
  confidence_score?: number | null
  warnings?: string[]
  error_message?: string | null
  created_at: string
}

function exportCsv(reports: BunkerReport[]) {
  const headers = ['Ref', 'Navio', 'Porto', 'Status', 'Ultima atividade']
  const rows = reports.map(r => [
    r.ref_number,
    r.vessel_name,
    r.port,
    r.status,
    r.last_activity_at ? new Date(r.last_activity_at).toLocaleString() : '',
  ])
  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `naabsa_reports_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function HistoricoPage() {
  const [reports, setReports] = useState<BunkerReport[]>([])
  const [logs, setLogs] = useState<ImportLog[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    let active = true

    Promise.all([
      fetch('/api/reports').then(async res => {
        if (!res.ok) throw new Error('load_failed')
        return res.json() as Promise<BunkerReport[]>
      }),
      fetch('/api/reports/import/logs').then(async res => {
        if (!res.ok) return { logs: [] as ImportLog[] }
        return res.json() as Promise<{ logs: ImportLog[] }>
      }),
    ])
      .then(([reportsData, logsData]) => {
        if (!active) return
        setReports(reportsData || [])
        setLogs(logsData.logs || [])
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        toast('error', 'Nao foi possivel carregar o historico')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [toast])

  async function handleReopen(id: string) {
    const res = await fetch(`/api/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    })
    if (!res.ok) {
      toast('error', 'Nao foi possivel reabrir o relatorio')
      return
    }
    const updated: BunkerReport = await res.json()
    setReports(prev => prev.map(r => r.id === id ? updated : r))
    toast('success', 'Relatorio reaberto')
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast('error', 'Nao foi possivel excluir o relatorio')
      return
    }
    setReports(prev => prev.filter(r => r.id !== id))
    toast('success', 'Relatorio excluido')
  }

  return (
    <>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Historico de relatorios
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 2 }}>
            Todos os relatorios e diagnosticos recentes
          </p>
        </div>
        <Button variant="secondary" onClick={() => exportCsv(reports)} style={{ gap: 6 }}>
          <Download size={14} /> Exportar CSV
        </Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '32px 0', color: 'var(--text-muted)' }}>
          <span className="spinner spinner-blue" />
          Carregando...
        </div>
      ) : (
        <>
          <section className="ops-section" style={{ marginBottom: 22 }}>
            <div className="ops-section-header">
              <div>
                <div className="ops-eyebrow">Diagnostico operacional</div>
                <h2>Ultimas importacoes</h2>
              </div>
            </div>
            {logs.length === 0 ? (
              <div className="ops-empty">Nenhuma importacao registrada ainda.</div>
            ) : (
              <div className="ops-log-list">
                {logs.slice(0, 8).map((log) => (
                  <div className={`ops-log-row ${log.error_message ? 'error' : ''}`} key={log.id}>
                    <div>
                      <strong>{log.file_name}</strong>
                      <span>{new Date(log.created_at).toLocaleString('pt-BR')} - {log.source_type || 'sem origem'} - {log.confidence_score ?? '-'}%</span>
                    </div>
                    <div>
                      {log.error_message ? log.error_message : `${log.warnings?.length || 0} ponto(s) para conferir`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <ReportsTable
            reports={reports}
            isGestor={true}
            onReopen={handleReopen}
            onDelete={handleDelete}
          />
        </>
      )}
    </>
  )
}
