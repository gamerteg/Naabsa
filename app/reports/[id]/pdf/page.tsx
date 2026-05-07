'use client'
import { useEffect, useState } from 'react'
import { PdfLayoutEditor } from '@/components/pdf/PdfLayoutEditor'
import type { BunkerReport } from '@/lib/types'

interface PageProps { params: Promise<{ id: string }> }

export default function ExportPdfPage({ params }: PageProps) {
  const [report, setReport] = useState<BunkerReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(async ({ id }) => {
      const res = await fetch(`/api/reports/${id}`)
      if (res.ok) setReport(await res.json())
      setLoading(false)
    })
  }, [params])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 10, color: 'var(--text-muted)' }}>
        <span className="spinner spinner-blue" style={{ width: 20, height: 20 }} />
        Preparando documento...
      </div>
    )
  }

  if (!report) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ color: 'var(--red-600)', fontWeight: 700 }}>Relatório não encontrado ou acesso negado.</div>
      </div>
    )
  }

  return <PdfLayoutEditor report={report} />
}
