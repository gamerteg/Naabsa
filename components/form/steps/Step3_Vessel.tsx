'use client'
import { useReport } from '@/contexts/ReportContext'
import { Input } from '@/components/ui/Input'

export function Step3_Vessel() {
  const { formData, updateFormData, isGestor } = useReport()

  return (
    <div>
      <div className="section-title">Vessel Particulars</div>
      <div className="form-grid-3" style={{ marginBottom: 20 }}>
        <Input label="Flag" value={formData.flag || ''} onChange={e => updateFormData({ flag: e.target.value })} />
        <Input label="Port of Registry" value={formData.port_registry || ''} onChange={e => updateFormData({ port_registry: e.target.value })} />
        <Input label="Callsign" value={formData.callsign || ''} onChange={e => updateFormData({ callsign: e.target.value })} />
        <Input label="IMO Number" value={formData.imo_number || ''} onChange={e => updateFormData({ imo_number: e.target.value })} />
        <Input label="Vessel Type" value={formData.vessel_type || ''} onChange={e => updateFormData({ vessel_type: e.target.value })} />
        <Input label="Delivered Year" value={formData.delivered_year || ''} onChange={e => updateFormData({ delivered_year: e.target.value })} />
        <Input label="LOA (m)" value={formData.loa || ''} onChange={e => updateFormData({ loa: e.target.value })} />
        <Input label="Boarding Date" type="date" value={formData.boarding_date || ''} onChange={e => updateFormData({ boarding_date: e.target.value })} />
        <Input label="Boarding Time" type="time" value={formData.boarding_time || ''} onChange={e => updateFormData({ boarding_time: e.target.value })} />
      </div>
      {isGestor && (
        <>
          <div className="section-title">Background</div>
          <div className="form-group">
            <label className="field-label">Background Text (Narrative)</label>
            <textarea
              className="field-input serif"
              rows={6}
              value={formData.background_text || ''}
              onChange={e => updateFormData({ background_text: e.target.value })}
              placeholder="Describe the background context of this survey..."
            />
          </div>
        </>
      )}
    </div>
  )
}
