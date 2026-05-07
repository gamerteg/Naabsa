'use client'
import { Plus, Trash2 } from 'lucide-react'
import type { TankRow } from '@/lib/types'
import { calcTankRow, calcTotals, formatNumber, createEmptyTankRow } from '@/lib/calculations'
import { Tooltip } from '@/components/ui/Tooltip'

interface TankTableProps {
  tanks: TankRow[]
  onChange: (tanks: TankRow[]) => void
  readOnly?: boolean
}

type EditableField = 'tank_name' | 'grade' | 'sounding_type' | 'sounding_value' | 'deg' | 'total_vol_observed' | 'free_water_dip' | 'free_water_vol' | 'vcf_tab_54b' | 'density_sg'

export function TankTable({ tanks, onChange, readOnly }: TankTableProps) {
  function updateRow(id: string, field: keyof TankRow, value: string | number) {
    const updated = tanks.map(t => {
      if (t.id !== id) return t
      const partial = { ...t, [field]: value }
      return calcTankRow(partial)
    })
    onChange(updated)
  }

  function addRow() {
    onChange([...tanks, createEmptyTankRow()])
  }

  function removeRow(id: string) {
    onChange(tanks.filter(t => t.id !== id))
  }

  const totals = calcTotals(tanks)

  const numInput = (id: string, field: EditableField, value: number, step = '0.001', minWidth = 70) => (
    <input
      type="number"
      className={`tank-input ${readOnly ? 'tank-input-auto' : ''}`}
      value={value || ''}
      step={step}
      readOnly={readOnly}
      style={{ minWidth }}
      onChange={e => updateRow(id, field, parseFloat(e.target.value) || 0)}
      aria-label={field}
    />
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ minWidth: 880 }}>
        <thead>
          <tr>
            <th>TANK</th>
            <th>GRADE</th>
            <th>TYPE</th>
            <th>SOUNDING (m)</th>
            <th>°C</th>
            <th>TOT VOL OBS (m³)</th>
            <th>FW DIP</th>
            <th>FW VOL (m³)</th>
            <th>
              <Tooltip content="Gross Observed Volume = Total Vol − FW Vol">
                <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>GROSS OBS</span>
              </Tooltip>
            </th>
            <th>
              <Tooltip content="Volume Correction Factor — Table 54B">
                <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>VCF 54B</span>
              </Tooltip>
            </th>
            <th>DENSITY SG</th>
            <th>
              <Tooltip content="Gross Standard Volume = Gross Obs × VCF">
                <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>GROSS STD</span>
              </Tooltip>
            </th>
            <th>
              <Tooltip content="In Vacuum = Gross Std × Density SG">
                <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>IN VAC (MT)</span>
              </Tooltip>
            </th>
            <th>
              <Tooltip content="In Air = In Vac × 0.9985">
                <span style={{ textDecoration: 'underline dotted', cursor: 'help' }}>IN AIR (MT)</span>
              </Tooltip>
            </th>
            {!readOnly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {tanks.length === 0 ? (
            <tr>
              <td colSpan={readOnly ? 13 : 14} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 12px', fontStyle: 'italic' }}>
                No tanks added yet.
              </td>
            </tr>
          ) : tanks.map(t => (
            <tr key={t.id}>
              <td>
                <input
                  className="tank-input"
                  type="text"
                  value={t.tank_name}
                  placeholder="HFO 1P"
                  readOnly={readOnly}
                  onChange={e => updateRow(t.id, 'tank_name', e.target.value)}
                  style={{ minWidth: 80 }}
                  aria-label="Tank name"
                />
              </td>
              <td>
                <select
                  className="tank-input"
                  value={t.grade}
                  disabled={readOnly}
                  onChange={e => updateRow(t.id, 'grade', e.target.value)}
                  aria-label="Grade"
                >
                  {['VLSFO', 'LSMGO', 'HFO', 'MDO'].map(g => <option key={g}>{g}</option>)}
                </select>
              </td>
              <td>
                <select
                  className="tank-input"
                  value={t.sounding_type}
                  disabled={readOnly}
                  onChange={e => updateRow(t.id, 'sounding_type', e.target.value)}
                  aria-label="Sounding type"
                >
                  <option value="U">U</option>
                  <option value="S">S</option>
                </select>
              </td>
              <td>{numInput(t.id, 'sounding_value', t.sounding_value)}</td>
              <td>{numInput(t.id, 'deg', t.deg, '0.1', 50)}</td>
              <td>{numInput(t.id, 'total_vol_observed', t.total_vol_observed)}</td>
              <td>
                <input
                  className="tank-input"
                  type="text"
                  value={t.free_water_dip}
                  placeholder="Nil"
                  readOnly={readOnly}
                  onChange={e => updateRow(t.id, 'free_water_dip', e.target.value)}
                  style={{ minWidth: 50 }}
                  aria-label="Free water dip"
                />
              </td>
              <td>{numInput(t.id, 'free_water_vol', t.free_water_vol)}</td>
              <td>
                <span className="tank-input tank-input-auto" style={{ display: 'block' }}>
                  {formatNumber(t.gross_obs_vol)}
                </span>
              </td>
              <td>{numInput(t.id, 'vcf_tab_54b', t.vcf_tab_54b, '0.0001', 80)}</td>
              <td>{numInput(t.id, 'density_sg', t.density_sg, '0.0001', 80)}</td>
              <td>
                <span className="tank-input tank-input-auto" style={{ display: 'block' }}>
                  {formatNumber(t.gross_std_vol)}
                </span>
              </td>
              <td>
                <span className="tank-input tank-input-auto" style={{ display: 'block' }}>
                  {formatNumber(t.in_vac)}
                </span>
              </td>
              <td>
                <span className="tank-input tank-input-auto" style={{ display: 'block', fontWeight: 700 }}>
                  {formatNumber(t.in_air)}
                </span>
              </td>
              {!readOnly && (
                <td>
                  <button
                    className="btn btn-destructive btn-icon btn-sm"
                    onClick={() => removeRow(t.id)}
                    aria-label={`Remove tank ${t.tank_name}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {/* Totals footer */}
        {tanks.length > 0 && (
          <tfoot>
            <tr className="table-footer">
              <td colSpan={8} style={{ textAlign: 'right', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                TOTALS:
              </td>
              <td style={{ fontWeight: 700 }}>{formatNumber(totals.total_gross_obs)}</td>
              <td colSpan={2}></td>
              <td style={{ fontWeight: 700 }}>{formatNumber(totals.total_gross_std)}</td>
              <td style={{ fontWeight: 700 }}>{formatNumber(totals.total_in_vac)}</td>
              <td style={{ fontWeight: 700, color: 'var(--navy-700)' }}>{formatNumber(totals.total_in_air)}</td>
              {!readOnly && <td></td>}
            </tr>
          </tfoot>
        )}
      </table>

      {!readOnly && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={addRow}
          style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}
          aria-label="Add tank row"
        >
          <Plus size={14} /> Add Tank
        </button>
      )}
    </div>
  )
}
