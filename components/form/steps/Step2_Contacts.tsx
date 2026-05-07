'use client'
import { useReport } from '@/contexts/ReportContext'
import { Input } from '@/components/ui/Input'

export function Step2_Contacts() {
  const { formData, updateFormData } = useReport()
  const ro = false

  return (
    <div>
      <div className="section-title">Customer</div>
      <div className="form-grid-2" style={{ marginBottom: 24 }}>
        <Input label="Company" value={formData.customer_company || ''} readOnly={ro} disabled={ro} onChange={e => updateFormData({ customer_company: e.target.value })} />
        <Input label="Contact Person" value={formData.customer_contact || ''} readOnly={ro} disabled={ro} onChange={e => updateFormData({ customer_contact: e.target.value })} />
      </div>
      <div className="section-title">Surveyor</div>
      <div className="form-grid-2" style={{ marginBottom: 24 }}>
        <Input label="Company" value={formData.surveyor_company || 'NAABSA Marine Surveyors'} readOnly={ro} disabled={ro} onChange={e => updateFormData({ surveyor_company: e.target.value })} />
        <Input label="Surveyor Name" value={formData.surveyor_name || ''} readOnly={ro} disabled={ro} onChange={e => updateFormData({ surveyor_name: e.target.value })} />
      </div>
      <div className="section-title">Supplier</div>
      <div className="form-grid-2" style={{ marginBottom: 24 }}>
        <Input label="Company" value={formData.supplier_company || ''} readOnly={ro} disabled={ro} onChange={e => updateFormData({ supplier_company: e.target.value })} />
        <Input label="Contact Person" value={formData.supplier_contact || ''} readOnly={ro} disabled={ro} onChange={e => updateFormData({ supplier_contact: e.target.value })} />
      </div>
      <div className="section-title">Vessel Officers</div>
      <div className="form-grid-2">
        <Input label="Master" value={formData.vessel_master || ''} readOnly={ro} disabled={ro} onChange={e => updateFormData({ vessel_master: e.target.value })} />
        <Input label="Chief Engineer" value={formData.vessel_chief_engineer || ''} readOnly={ro} disabled={ro} onChange={e => updateFormData({ vessel_chief_engineer: e.target.value })} />
      </div>
    </div>
  )
}
