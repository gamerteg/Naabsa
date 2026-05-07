'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, FileSpreadsheet, ImagePlus, ListChecks, Ship } from 'lucide-react'

import { ReportsTable } from '@/components/dashboard/ReportsTable'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'
import type { BunkerReport, Profile } from '@/lib/types'
import { getOperationalBucket } from '@/lib/report-ui'

const BUCKETS = [
  { title: 'Importados para revisar', icon: FileSpreadsheet },
  { title: 'Aguardando fotos', icon: ImagePlus },
  { title: 'Prontos para finalizar', icon: ListChecks },
  { title: 'Finalizados', icon: CheckCircle },
]

export default function GestorDashboard() {
  const [reports, setReports] = useState<BunkerReport[]>([])
  const [collaborators, setCollaborators] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [archiveId, setArchiveId] = useState<string | null>(null)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/reports')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const reps: BunkerReport[] = await res.json()
      setReports(reps)

      const colabsRes = await fetch('/api/profiles?role=colaborador&active=true')
      if (!colabsRes.ok) throw new Error(`HTTP ${colabsRes.status}`)
      const colabs: Profile[] = await colabsRes.json()
      setCollaborators(colabs || [])
    } catch {
      setError('Nao foi possivel carregar a esteira. Confira a conexao com o Supabase e as policies RLS.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleApprove(id: string) {
    const res = await fetch(`/api/reports/${id}/approve`, { method: 'POST' })
    if (!res.ok) { toast('error', 'Nao foi possivel finalizar o relatorio'); return }
    toast('success', 'Relatorio finalizado')
    await load()
  }

  async function confirmArchive() {
    if (!archiveId) return
    const res = await fetch(`/api/reports/${archiveId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    if (!res.ok) {
      toast('error', 'Nao foi possivel arquivar o relatorio')
      return
    }
    toast('info', 'Relatorio arquivado')
    setArchiveId(null)
    await load()
  }

  async function confirmDelete() {
    if (!deleteId) return
    const res = await fetch(`/api/reports/${deleteId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast('error', 'Nao foi possivel excluir o relatorio')
      return
    }
    toast('success', 'Relatorio excluido')
    setDeleteId(null)
    await load()
  }

  const activeReports = reports.filter(r => !['archived', 'approved'].includes(r.status))
  const bucketCounts = BUCKETS.map(({ title }) => ({
    title,
    count: reports.filter(report => getOperationalBucket(report) === title).length,
  }))

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 12 }}>
        <span className="spinner spinner-blue" style={{ width: 20, height: 20 }} />
        <span style={{ color: 'var(--text-muted)' }}>Carregando esteira...</span>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="ops-alert danger">
          {error}
        </div>
      )}

      <section className="ops-hero">
        <div>
          <div className="ops-eyebrow">Esteira operacional</div>
          <h1>Relatorios BQS em producao</h1>
          <p>{activeReports.length} relatorios ativos para revisar, fotografar ou finalizar.</p>
        </div>
        <Link href="/reports/new" className="btn btn-primary">
          <FileSpreadsheet size={16} /> Importar planilha BQS
        </Link>
      </section>

      <section className="ops-buckets" aria-label="Resumo da esteira">
        {BUCKETS.map(({ title, icon: Icon }) => {
          const count = bucketCounts.find(bucket => bucket.title === title)?.count ?? 0
          return (
            <div className="ops-bucket" key={title}>
              <Icon size={18} />
              <span>{title}</span>
              <strong>{count}</strong>
            </div>
          )
        })}
      </section>

      <section className="ops-section">
        <div className="ops-section-header">
          <div>
            <h2>Fila de trabalho</h2>
            <p>Abra cada relatorio pela proxima acao sugerida.</p>
          </div>
          <div className="ops-mini-stat">
            <Ship size={15} /> {reports.length} no total
          </div>
        </div>
        <ReportsTable
          reports={reports}
          collaborators={collaborators}
          isGestor={true}
          onApprove={handleApprove}
          onArchive={id => setArchiveId(id)}
          onDelete={id => setDeleteId(id)}
        />
      </section>

      <Modal open={!!archiveId} onClose={() => setArchiveId(null)} title="Arquivar relatorio"
        footer={<><Button variant="ghost" onClick={() => setArchiveId(null)}>Cancelar</Button><Button variant="secondary" onClick={confirmArchive}>Arquivar</Button></>}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: "'Source Serif 4', serif" }}>
          O relatorio sairá da fila principal, mas continuará disponivel no historico.
        </p>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Excluir relatorio"
        footer={<><Button variant="ghost" onClick={() => setDeleteId(null)}>Cancelar</Button><Button variant="destructive" onClick={confirmDelete}>Excluir definitivamente</Button></>}>
        <div className="ops-alert danger" style={{ marginBottom: 16 }}>
          Esta acao nao pode ser desfeita.
        </div>
        <p style={{ color: 'var(--text-secondary)', fontFamily: "'Source Serif 4', serif" }}>
          Todos os dados associados a este relatorio serao removidos.
        </p>
      </Modal>
    </>
  )
}
