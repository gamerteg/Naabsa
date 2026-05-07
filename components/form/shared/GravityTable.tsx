'use client'
import { Plus, Trash2 } from 'lucide-react'
import type { GravityRow } from '@/lib/types'
import { createEmptyGravityRow } from '@/lib/calculations'

interface GravityTableProps {
  rows: GravityRow[]
  onChange: (rows: GravityRow[]) => void
  readOnly?: boolean
}

export function GravityTable({ rows, onChange, readOnly }: GravityTableProps) {
  function update(id: string, field: 'temperature_c' | 'specific_gravity', value: number) {
    onChange(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  return (
    <div>
      <table className="data-table" style={{ maxWidth: 320 }}>
        <thead>
          <tr>
            <th>TEMP °C</th>
            <th>SPECIFIC GRAVITY</th>
            {!readOnly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>
                <input type="number" className="tank-input" value={r.temperature_c || ''} step="0.1"
                  readOnly={readOnly} onChange={e => update(r.id, 'temperature_c', parseFloat(e.target.value) || 0)}
                  aria-label="Temperature" />
              </td>
              <td>
                <input type="number" className="tank-input" value={r.specific_gravity || ''} step="0.0001"
                  readOnly={readOnly} onChange={e => update(r.id, 'specific_gravity', parseFloat(e.target.value) || 0)}
                  aria-label="Specific gravity" />
              </td>
              {!readOnly && (
                <td>
                  <button className="btn btn-destructive btn-icon btn-sm" onClick={() => onChange(rows.filter(x => x.id !== r.id))} aria-label="Remove row">
                    <Trash2 size={12} />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={readOnly ? 2 : 3} style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px' }}>No entries</td></tr>
          )}
        </tbody>
      </table>
      {!readOnly && (
        <button className="btn btn-ghost btn-sm" onClick={() => onChange([...rows, createEmptyGravityRow()])} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }} aria-label="Add gravity row">
          <Plus size={14} /> Add Row
        </button>
      )}
    </div>
  )
}
