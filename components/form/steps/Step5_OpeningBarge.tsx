'use client'
import { useReport } from '@/contexts/ReportContext'
import { Input } from '@/components/ui/Input'
import { TankTable } from '@/components/form/shared/TankTable'
import { AutoField } from '@/components/form/shared/AutoField'
import { GravityTable } from '@/components/form/shared/GravityTable'
import { PhotoUploader } from '@/components/form/shared/PhotoUploader'
import { calcNaabsaFigure, formatNumber } from '@/lib/calculations'
import type { TankRow, GravityRow, PhotoItem } from '@/lib/types'

export function Step5_OpeningBarge() {
  const { formData, updateFormData, reportId } = useReport()

  const tanks = formData.barge_tanks_open || []
  const surveyorFigure = calcNaabsaFigure(tanks)
  const inspectorFigure = formData.barge_inspector_figure_open || 0
  const difference = surveyorFigure - inspectorFigure

  return (
    <div>
      <div className="section-title">Barge Draft & Info</div>
      <div className="form-grid-4" style={{ marginBottom: 24 }}>
        <Input label="Draft Fore (m)" type="number" step="0.01" value={formData.draft_fore_barge_open || ''} onChange={e => updateFormData({ draft_fore_barge_open: parseFloat(e.target.value) || 0 })} />
        <Input label="Draft Aft (m)" type="number" step="0.01" value={formData.draft_aft_barge_open || ''} onChange={e => updateFormData({ draft_aft_barge_open: parseFloat(e.target.value) || 0 })} />
        <Input label="List (°)" type="number" step="0.1" value={formData.list_barge_open || ''} onChange={e => updateFormData({ list_barge_open: parseFloat(e.target.value) || 0 })} />
        <Input label="Flowmeter Status" value={formData.flowmeter_status_open || ''} onChange={e => updateFormData({ flowmeter_status_open: e.target.value })} placeholder="e.g. OUT OF ORDER" />
      </div>
      <div className="form-grid-3" style={{ marginBottom: 24 }}>
        <Input label="Sounding Date" type="date" value={formData.barge_sounding_date || ''} onChange={e => updateFormData({ barge_sounding_date: e.target.value })} />
        <Input label="Time Start" type="time" value={formData.barge_sounding_time_start || ''} onChange={e => updateFormData({ barge_sounding_time_start: e.target.value })} />
        <Input label="Time End" type="time" value={formData.barge_sounding_time_end || ''} onChange={e => updateFormData({ barge_sounding_time_end: e.target.value })} />
      </div>

      <div className="section-title">Barge Tanks — Opening Soundings</div>
      <TankTable tanks={tanks} onChange={t => updateFormData({ barge_tanks_open: t as TankRow[] })} />

      <div className="section-title" style={{ marginTop: 24 }}>Summary</div>
      <div className="form-grid-3">
        <Input label="Inspector Figure (MT)" type="number" step="0.001" value={formData.barge_inspector_figure_open || ''} onChange={e => updateFormData({ barge_inspector_figure_open: parseFloat(e.target.value) || 0 })} />
        <AutoField label="Surveyor Figure (MT)" value={surveyorFigure} tooltip="Sum of In Air of barge tanks" />
        <div className="form-group">
          <label className="field-label">Difference (MT)</label>
          <div style={{ background: 'var(--navy-100)', border: '1px solid var(--navy-300)', borderRadius: 3, padding: '8px 12px', fontWeight: 700, color: difference >= 0 ? 'var(--status-success-text)' : 'var(--red-600)' }}>
            {formatNumber(difference)}
          </div>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>Temperature Method</div>
      <div className="form-grid-2" style={{ marginBottom: 20 }}>
        <Input label="Barge Temp Method" value={formData.barge_temp_method || ''} onChange={e => updateFormData({ barge_temp_method: e.target.value })} placeholder="e.g. Glass thermometer" />
      </div>

      <div className="section-title">Barge Specific Gravities</div>
      <GravityTable rows={formData.barge_gravities_open || []} onChange={rows => updateFormData({ barge_gravities_open: rows as GravityRow[] })} />

      <div style={{ marginTop: 32 }}>
        <PhotoUploader
          photos={formData.photos || []}
          category="barge_tanks"
          reportId={reportId}
          onChange={p => updateFormData({ photos: p as PhotoItem[] })}
        />
      </div>
    </div>
  )
}
