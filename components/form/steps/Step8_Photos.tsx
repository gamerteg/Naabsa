'use client'
import { useReport } from '@/contexts/ReportContext'
import { PhotoUploader } from '@/components/form/shared/PhotoUploader'
import type { PhotoItem } from '@/lib/types'
import { DEFAULT_ATTACHMENTS } from '@/lib/types'
import { Plus } from 'lucide-react'

export function Step8_Photos() {
  const { formData, updateFormData, reportId } = useReport()
  const photos = formData.photos || []
  const attachments = formData.attachments || DEFAULT_ATTACHMENTS

  function toggleAttachment(idx: number) {
    const updated = attachments.map((a, i) => i === idx ? { ...a, checked: !a.checked } : a)
    updateFormData({ attachments: updated })
  }

  function addCustomAttachment() {
    const label = prompt('Attachment label:')
    if (label?.trim()) {
      updateFormData({ attachments: [...attachments, { label: label.trim(), checked: false }] })
    }
  }

  return (
    <div>
      {/* Sampling photos — vessel/barge photos are collected in Steps 4 & 5 */}
      <div style={{ marginBottom: 32 }}>
        <PhotoUploader
          photos={photos}
          category="sampling"
          reportId={reportId}
          onChange={p => updateFormData({ photos: p as PhotoItem[] })}
        />
      </div>

      {/* Attachments checklist */}
      <div className="section-title">Attachments Checklist</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {attachments.map((a, i) => (
          <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 14px', background: a.checked ? 'var(--status-success-bg)' : 'var(--bg-surface)', border: `1px solid ${a.checked ? 'var(--status-success-border)' : 'var(--border-default)'}`, borderRadius: 3, transition: 'all 150ms' }}>
            <input type="checkbox" checked={a.checked} onChange={() => toggleAttachment(i)} style={{ width: 16, height: 16, accentColor: 'var(--status-success-text)' }} aria-label={a.label} />
            <span style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: a.checked ? 'var(--status-success-text)' : 'var(--text-primary)', fontFamily: "'Source Serif 4', serif" }}>
              {a.label}
            </span>
          </label>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={addCustomAttachment} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }} aria-label="Add custom attachment item">
          <Plus size={14} /> Add Custom Item
        </button>
      </div>
    </div>
  )
}
