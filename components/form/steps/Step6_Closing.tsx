'use client'
import { useReport } from '@/contexts/ReportContext'
import { Input } from '@/components/ui/Input'
import { TankTable } from '@/components/form/shared/TankTable'
import { AutoField } from '@/components/form/shared/AutoField'
import { calcNaabsaFigure, formatNumber } from '@/lib/calculations'
import type { TankRow } from '@/lib/types'

export function Step6_Closing() {
  const { formData, updateFormData } = useReport()

  const vesselTanksClose = formData.vessel_tanks_close || []
  const bargeTanksClose = formData.barge_tanks_close || []

  const initialQuantity = formData.naabsa_figure || calcNaabsaFigure(formData.vessel_tanks_open || [])
  const finalQuantity = calcNaabsaFigure(vesselTanksClose)
  const diffVessel = finalQuantity - initialQuantity

  const surveyorBargeClose = calcNaabsaFigure(bargeTanksClose)
  const inspectorBargeClose = formData.barge_inspector_figure_close || 0
  const diffBarge = surveyorBargeClose - inspectorBargeClose

  return (
    <div>
      {/* Vessel Closing */}
      <div className="section-title">Vessel — Closing Soundings</div>
      <div className="form-grid-4" style={{ marginBottom: 20 }}>
        <Input label="Draft Fore (m)" type="number" step="0.01" value={formData.draft_fore_close || ''} onChange={e => updateFormData({ draft_fore_close: parseFloat(e.target.value) || 0 })} />
        <Input label="Draft Aft (m)" type="number" step="0.01" value={formData.draft_aft_close || ''} onChange={e => updateFormData({ draft_aft_close: parseFloat(e.target.value) || 0 })} />
        <Input label="List (°)" type="number" step="0.1" value={formData.list_close || ''} onChange={e => updateFormData({ list_close: parseFloat(e.target.value) || 0 })} />
        <Input label="Closing Date" type="date" value={formData.closing_date || ''} onChange={e => updateFormData({ closing_date: e.target.value })} />
        <Input label="Time Start" type="time" value={formData.closing_time_start || ''} onChange={e => updateFormData({ closing_time_start: e.target.value })} />
        <Input label="Time End" type="time" value={formData.closing_time_end || ''} onChange={e => updateFormData({ closing_time_end: e.target.value })} />
      </div>
      <TankTable tanks={vesselTanksClose} onChange={t => updateFormData({ vessel_tanks_close: t as TankRow[] })} />

      <div className="form-grid-3" style={{ marginTop: 20, marginBottom: 24 }}>
        <AutoField label="Initial Quantity (MT)" value={initialQuantity} tooltip="= NAABSA Figure from Opening Step 4" />
        <AutoField label="Final Quantity (MT)" value={finalQuantity} tooltip="Sum of In Air from closing tanks" />
        <div className="form-group">
          <label className="field-label">Difference — Vessel (MT)</label>
          <div style={{ background: 'var(--navy-100)', border: '1px solid var(--navy-300)', borderRadius: 3, padding: '8px 12px', fontWeight: 700, color: diffVessel >= 0 ? 'var(--status-success-text)' : 'var(--red-600)' }}>
            {formatNumber(diffVessel)}
          </div>
        </div>
      </div>

      {/* Barge Closing */}
      <div className="section-title">Barge — Closing Soundings</div>
      <div className="form-grid-3" style={{ marginBottom: 20 }}>
        <Input label="Closing Date" type="date" value={formData.closing_barge_date || ''} onChange={e => updateFormData({ closing_barge_date: e.target.value })} />
        <Input label="Time Start" type="time" value={formData.closing_barge_time_start || ''} onChange={e => updateFormData({ closing_barge_time_start: e.target.value })} />
        <Input label="Time End" type="time" value={formData.closing_barge_time_end || ''} onChange={e => updateFormData({ closing_barge_time_end: e.target.value })} />
        <Input label="Flowmeter Status (Closing)" value={formData.flowmeter_close || ''} onChange={e => updateFormData({ flowmeter_close: e.target.value })} />
      </div>
      <TankTable tanks={bargeTanksClose} onChange={t => updateFormData({ barge_tanks_close: t as TankRow[] })} />

      <div className="form-grid-3" style={{ marginTop: 20 }}>
        <Input label="Inspector Figure — Barge Close (MT)" type="number" step="0.001" value={formData.barge_inspector_figure_close || ''} onChange={e => updateFormData({ barge_inspector_figure_close: parseFloat(e.target.value) || 0 })} />
        <AutoField label="Surveyor Figure — Barge Close (MT)" value={surveyorBargeClose} />
        <div className="form-group">
          <label className="field-label">Difference — Barge (MT)</label>
          <div style={{ background: 'var(--navy-100)', border: '1px solid var(--navy-300)', borderRadius: 3, padding: '8px 12px', fontWeight: 700, color: diffBarge >= 0 ? 'var(--status-success-text)' : 'var(--red-600)' }}>
            {formatNumber(diffBarge)}
          </div>
        </div>
      </div>
    </div>
  )
}
