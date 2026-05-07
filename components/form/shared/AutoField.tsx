'use client'
import { Lock } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatNumber } from '@/lib/calculations'

interface AutoFieldProps {
  label: string
  value: number
  decimals?: number
  unit?: string
  tooltip?: string
}

export function AutoField({ label, value, decimals = 3, unit, tooltip }: AutoFieldProps) {
  const display = `${formatNumber(value, decimals)}${unit ? ` ${unit}` : ''}`
  
  const content = (
    <div className="form-group">
      <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {tooltip && (
          <span style={{ color: 'var(--navy-500)', fontSize: 'var(--text-xs)', cursor: 'help', fontFamily: 'monospace' }}>?</span>
        )}
      </label>
      <div style={{
        background: 'var(--navy-100)',
        border: '1px solid var(--navy-300)',
        borderRadius: 3,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 600, color: 'var(--navy-700)', fontSize: 'var(--text-base)' }}>
          {display}
        </span>
        <Lock size={11} style={{ color: 'var(--navy-300)' }} aria-label="Calculated automatically" />
      </div>
    </div>
  )

  if (tooltip) {
    return <Tooltip content={tooltip}>{content}</Tooltip>
  }
  return content
}
