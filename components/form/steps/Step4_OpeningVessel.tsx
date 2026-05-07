'use client'
import { useReport } from '@/contexts/ReportContext'
import { Input } from '@/components/ui/Input'
import { TankTable } from '@/components/form/shared/TankTable'
import { AutoField } from '@/components/form/shared/AutoField'
import { GravityTable } from '@/components/form/shared/GravityTable'
import { PhotoUploader } from '@/components/form/shared/PhotoUploader'
import { calcNaabsaFigure, formatNumber } from '@/lib/calculations'
import type { TankRow, GravityRow, PhotoItem } from '@/lib/types'

export function Step4_OpeningVessel() {
  const { formData, updateFormData, reportId } = useReport()

  const tanks = formData.vessel_tanks_open || []
  const naabsaFigure = calcNaabsaFigure(tanks)
  const logbook = formData.logbook_figure || 0
  const difference = naabsaFigure - logbook

  return (
    <div>
      <div className="section-title">Draft & Sounding Info</div>
      <div className="form-grid-4" style={{ marginBottom: 24 }}>
        <Input label="Draft Fore (m)" type="number" step="0.01" value={formData.draft_fore_open || ''} onChange={e => updateFormData({ draft_fore_open: parseFloat(e.target.value) || 0 })} />
        <Input label="Draft Aft (m)" type="number" step="0.01" value={formData.draft_aft_open || ''} onChange={e => updateFormData({ draft_aft_open: parseFloat(e.target.value) || 0 })} />
        <Input label="List (°)" type="number" step="0.1" value={formData.list_open || ''} onChange={e => updateFormData({ list_open: parseFloat(e.target.value) || 0 })} />
        <div className="form-group">
          <label className="field-label">Trim Correction</label>
          <div style={{ display: 'flex', gap: 16, paddingTop: 8 }}>
            {['Applied', 'N/A'].map(v => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                <input type="radio" name="trim_open" value={v} checked={formData.trim_correction_applied === (v === 'Applied')} onChange={() => updateFormData({ trim_correction_applied: v === 'Applied' })} />
                {v}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="form-grid-3" style={{ marginBottom: 24 }}>
        <Input label="Sounding Date" type="date" value={formData.sounding_date_open || ''} onChange={e => updateFormData({ sounding_date_open: e.target.value })} />
        <Input label="Time Start" type="time" value={formData.sounding_time_start_open || ''} onChange={e => updateFormData({ sounding_time_start_open: e.target.value })} />
        <Input label="Time End" type="time" value={formData.sounding_time_end_open || ''} onChange={e => updateFormData({ sounding_time_end_open: e.target.value })} />
        <Input label="Responsible Engineer" value={formData.vessel_engineer_open || ''} onChange={e => updateFormData({ vessel_engineer_open: e.target.value })} />
      </div>

      <div className="section-title">Vessel Tanks — Opening Soundings</div>
      <TankTable tanks={tanks} onChange={t => updateFormData({ vessel_tanks_open: t as TankRow[] })} />

      <div className="section-title" style={{ marginTop: 24 }}>Summary</div>
      <div className="form-grid-3">
        <Input label="Logbook Figure (MT)" type="number" step="0.001" value={formData.logbook_figure || ''} onChange={e => updateFormData({ logbook_figure: parseFloat(e.target.value) || 0 })} />
        <AutoField label="NAABSA Figure (MT)" value={naabsaFigure} tooltip="Sum of In Air values from all tanks" />
        <div className="form-group">
          <label className="field-label">Difference (MT)</label>
          <div style={{ background: 'var(--navy-100)', border: '1px solid var(--navy-300)', borderRadius: 3, padding: '8px 12px', fontWeight: 700, color: difference >= 0 ? 'var(--status-success-text)' : 'var(--red-600)', fontSize: 'var(--text-base)' }}>
            {formatNumber(difference)}
          </div>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 24 }}>Temperatures</div>
      <div className="form-grid-3" style={{ marginBottom: 20 }}>
        <Input label="Storage Tanks Temp Source" value={formData.storage_tanks_temp_source || ''} onChange={e => updateFormData({ storage_tanks_temp_source: e.target.value })} />
        <Input label="Service/Settling Temp Source" value={formData.service_settling_temp_source || ''} onChange={e => updateFormData({ service_settling_temp_source: e.target.value })} />
        <Input label="Overflow Tank Temp Source" value={formData.overflow_temp_source || ''} onChange={e => updateFormData({ overflow_temp_source: e.target.value })} />
        <Input label="Engine Room Temp (°C)" type="number" step="0.1" value={formData.engine_room_temp || ''} onChange={e => updateFormData({ engine_room_temp: parseFloat(e.target.value) || 0 })} />
        <Input label="Sea Water Temp (°C)" type="number" step="0.1" value={formData.sea_water_temp || ''} onChange={e => updateFormData({ sea_water_temp: parseFloat(e.target.value) || 0 })} />
      </div>

      <div className="section-title">Specific Gravities</div>
      <GravityTable rows={formData.vessel_gravities_open || []} onChange={rows => updateFormData({ vessel_gravities_open: rows as GravityRow[] })} />

      <div style={{ marginTop: 32 }}>
        <PhotoUploader
          photos={formData.photos || []}
          category="vessel_tanks"
          reportId={reportId}
          onChange={p => updateFormData({ photos: p as PhotoItem[] })}
        />
      </div>
    </div>
  )
}
