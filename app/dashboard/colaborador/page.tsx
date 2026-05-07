'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileSpreadsheet, ImagePlus, ListChecks, CheckCircle } from 'lucide-react'

import { ReportsTable } from '@/components/dashboard/ReportsTable'
import { useAuth } from '@/contexts/AuthContext'
import type { BunkerReport } from '@/lib/types'
import { getOperationalBucket } from '@/lib/report-ui'

const BUCKETS = [
  { title: 'Importados para revisar', icon: FileSpreadsheet },
  { title: 'Aguardando fotos', icon: ImagePlus },
  { title: 'Prontos para finalizar', icon: ListChecks },
  { title: 'Finalizados', icon: CheckCircle },
]

export default function ColaboradorDashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const [reports, setReports] = useState<BunkerReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading || !user) return
    async function load() {
      setLoading(true)
      setError('')
      const res = await fetch('/api/my-reports')
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Nao foi possivel carregar os relatorios' }))
        setReports([])
        setError(err.error || 'Nao foi possivel carregar os relatorios')
        setLoading(false)
        return
      }

      const reps: BunkerReport[] = await res.json()
      setReports(reps || [])
      setLoading(false)
    }
    load()
  }, [user, authLoading])

  const activeReports = reports.filter(r => !['archived', 'approved'].includes(r.status))

  return (
    <>
      {error && <div className="ops-alert danger">{error}</div>}

      <section className="ops-hero">
        <div>
          <div className="ops-eyebrow">Minha esteira</div>
          <h1>Ola, {profile?.full_name?.split(' ')[0] || 'colaborador'}</h1>
          <p>{activeReports.length} relatorios ativos para revisar, completar fotos ou finalizar.</p>
        </div>
        <Link href="/reports/new" className="btn btn-primary">
          <FileSpreadsheet size={16} /> Importar planilha BQS
        </Link>
      </section>

      <section className="ops-buckets" aria-label="Resumo da minha esteira">
        {BUCKETS.map(({ title, icon: Icon }) => (
          <div className="ops-bucket" key={title}>
            <Icon size={18} />
            <span>{title}</span>
            <strong>{reports.filter(report => getOperationalBucket(report) === title).length}</strong>
          </div>
        ))}
      </section>

      <section className="ops-section">
        <div className="ops-section-header">
          <div>
            <h2>Meus relatorios</h2>
            <p>Continue exatamente do ponto onde cada relatorio parou.</p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '32px 0', color: 'var(--text-muted)' }}>
            <span className="spinner spinner-blue" />
            Carregando relatorios...
          </div>
        ) : (
          <ReportsTable reports={reports} />
        )}
      </section>
    </>
  )
}
