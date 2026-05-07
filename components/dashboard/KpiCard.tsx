'use client'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  icon: LucideIcon
  value: number | string
  label: string
  alert?: boolean
  onClick?: () => void
}

export function KpiCard({ icon: Icon, value, label, alert, onClick }: KpiCardProps) {
  return (
    <div
      className={`kpi-card ${alert ? 'alert-card' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="kpi-value">{value}</div>
        <Icon size={20} style={{ color: alert ? 'var(--red-600)' : 'var(--navy-500)', marginTop: 4 }} aria-hidden="true" />
      </div>
      <div className="kpi-label">{label}</div>
    </div>
  )
}
