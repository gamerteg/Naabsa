'use client'
import { useReport } from '@/contexts/ReportContext'
import { Input } from '@/components/ui/Input'
import { AutoField } from '@/components/form/shared/AutoField'
import { deriveFinalFigures, formatNumber } from '@/lib/calculations'

export function Step7_FinalFigures() {
  const { formData, updateFormData } = useReport()

  const bdn = formData.bdn_figure || 0
  const { surveyor_final_figure: surveyorFigure, final_difference_mt: mt, final_difference_pct: pct } = deriveFinalFigures({ ...formData, bdn_figure: bdn })

  return (
    <div>
      <div className="section-title">Final Figures</div>
      <div className="form-grid-3" style={{ marginBottom: 24 }}>
        <Input label="BDN Figure (MT)" type="number" step="0.001" value={formData.bdn_figure || ''} onChange={e => updateFormData({ bdn_figure: parseFloat(e.target.value) || 0 })} />
        <AutoField label="Surveyor Final Figure (MT)" value={surveyorFigure} tooltip="= Difference Vessel Closing" />
        <div className="form-group">
          <label className="field-label">Difference (MT)</label>
          <div style={{ background: 'var(--navy-100)', border: '1px solid var(--navy-300)', borderRadius: 3, padding: '8px 12px', fontWeight: 700, color: Math.abs(mt) > 0.1 ? 'var(--red-600)' : 'var(--status-success-text)', fontSize: 'var(--text-base)' }}>
            {formatNumber(mt)}
          </div>
        </div>
        <div className="form-group">
          <label className="field-label">Difference (%)</label>
          <div style={{ background: 'var(--navy-100)', border: '1px solid var(--navy-300)', borderRadius: 3, padding: '8px 12px', fontWeight: 700, color: Math.abs(pct) > 0.5 ? 'var(--red-600)' : 'var(--status-success-text)', fontSize: 'var(--text-xl)' }}>
            {pct.toFixed(3)}%
          </div>
        </div>
      </div>

      <div className="section-title">Letter of Protest</div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        {[true, false].map(v => (
          <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            <input type="radio" name="protest" checked={formData.letter_of_protest === v} onChange={() => updateFormData({ letter_of_protest: v })} />
            {v ? 'Yes — Protest Issued' : 'No'}
          </label>
        ))}
      </div>
      {formData.letter_of_protest && (
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="field-label">Protest Description</label>
          <textarea className="field-input serif" rows={4} value={formData.protest_description || ''} onChange={e => updateFormData({ protest_description: e.target.value })} placeholder="Describe the reason for protest..." />
        </div>
      )}

      <div className="section-title">Second Sounding</div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        {[true, false].map(v => (
          <label key={String(v)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            <input type="radio" name="second_sounding" checked={formData.second_sounding_done === v} onChange={() => updateFormData({ second_sounding_done: v })} />
            {v ? 'Yes — Second Sounding Done' : 'No'}
          </label>
        ))}
      </div>
      {formData.second_sounding_done && (
        <div className="form-grid-2" style={{ marginBottom: 24 }}>
          <Input label="Date" type="date" value={formData.second_sounding_date || ''} onChange={e => updateFormData({ second_sounding_date: e.target.value })} />
          <Input label="Time Range" value={formData.second_sounding_time_range || ''} onChange={e => updateFormData({ second_sounding_time_range: e.target.value })} placeholder="e.g. 14:00 – 16:00" />
        </div>
      )}

      <div className="section-title">ROB After Bunkering</div>
      <div className="form-grid-2">
        <Input label="ROB After Bunkering (MT)" type="number" step="0.001" value={formData.rob_after_bunkering || ''} onChange={e => updateFormData({ rob_after_bunkering: parseFloat(e.target.value) || 0 })} />
        <Input label="ROB Trim (m)" type="number" step="0.001" value={formData.rob_trim || ''} onChange={e => updateFormData({ rob_trim: parseFloat(e.target.value) || 0 })} />
      </div>
    </div>
  )
}
