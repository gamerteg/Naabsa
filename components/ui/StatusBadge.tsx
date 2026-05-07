'use client'
import { type ReportStatus } from '@/lib/types'
import { OPERATIONAL_STATUS_LABELS } from '@/lib/report-ui'

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string }> = {
  draft:              { label: OPERATIONAL_STATUS_LABELS.draft,              className: 'badge-draft' },
  in_progress:        { label: OPERATIONAL_STATUS_LABELS.in_progress,        className: 'badge-in_progress' },
  pending_review:     { label: OPERATIONAL_STATUS_LABELS.pending_review,     className: 'badge-pending_review' },
  revision_requested: { label: OPERATIONAL_STATUS_LABELS.revision_requested, className: 'badge-revision_requested' },
  approved:           { label: OPERATIONAL_STATUS_LABELS.approved,           className: 'badge-approved' },
  archived:           { label: OPERATIONAL_STATUS_LABELS.archived,           className: 'badge-archived' },
}

export function StatusBadge({ status, pulsing }: { status: ReportStatus; pulsing?: boolean }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`badge ${cfg.className} ${pulsing ? 'badge-pulsing' : ''}`}>
      {cfg.label}
    </span>
  )
}

export function Badge({
  children,
  variant = 'neutral',
}: {
  children: React.ReactNode
  variant?: 'neutral' | 'success' | 'danger' | 'warning' | 'info'
}) {
  const classMap = {
    neutral: 'badge-draft',
    success: 'badge-approved',
    danger: 'badge-revision_requested',
    warning: 'badge-in_progress',
    info: 'badge-pending_review',
  }
  return <span className={`badge ${classMap[variant]}`}>{children}</span>
}
