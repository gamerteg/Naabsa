'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { BunkerReport } from '@/lib/types'
import { Button } from '@/components/ui/Button'

interface AlertsPanelProps {
  reports: BunkerReport[]
  onRemind: (reportId: string, collaboratorId: string) => void
}

export function AlertsPanel({ reports, onRemind }: AlertsPanelProps) {
  const [now, setNow] = useState(() => Date.now())

  function formatHoursAgo(date: string): string {
    const hours = Math.floor((now - new Date(date).getTime()) / 3600000)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  const stale = reports.filter(r => {
    if (!['in_progress', 'revision_requested'].includes(r.status)) return false
    const diff = now - new Date(r.last_activity_at).getTime()
    return diff > 48 * 3600000
  })

  return (
    <div className="card" style={{ minWidth: 260 }}>
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <AlertTriangle size={16} style={{ color: 'var(--red-600)' }} aria-hidden="true" />
        <span style={{
          fontFamily: "'Barlow Semi Condensed', sans-serif",
          fontWeight: 700, fontSize: 'var(--text-sm)',
          color: 'var(--navy-700)', textTransform: 'uppercase',
          letterSpacing: '0.06em'
        }}>
          No Activity +48h
        </span>
        {stale.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            background: 'var(--red-600)', color: '#FFF',
            borderRadius: 10, padding: '1px 7px',
            fontSize: 'var(--text-xs)', fontWeight: 700,
          }}>
            {stale.length}
          </span>
        )}
      </div>

      {stale.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          All reports are active ✓
        </div>
      ) : (
        stale.map(r => {
          const collaborator = r.assignments?.[0]?.profiles
          return (
            <div key={r.id} className="alert-item">
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--navy-700)' }}>
                  {r.vessel_name}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {collaborator?.full_name || 'Unassigned'} · {formatHoursAgo(r.last_activity_at)}
                </div>
              </div>
              {collaborator && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRemind(r.id, collaborator.id)}
                >
                  Remind Collaborator
                </Button>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
