'use client'
import { useRef, useState } from 'react'
import { useReport } from '@/contexts/ReportContext'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastProvider'
import { UploadCloud, X, AlertCircle } from 'lucide-react'

export function Step1_General() {
  const { formData, updateFormData, reportId } = useReport()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const toast = useToast()

  async function handleCoverPhoto(file: File) {
    setUploading(true)
    setUploadError(null)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${reportId}/cover/cover.${ext}`
    const { data, error } = await supabase.storage
      .from('survey-photos')
      .upload(path, file, { upsert: true })

    if (error || !data) {
      const msg = 'Cover photo upload failed. Check that the storage bucket "survey-photos" exists and has upload policies enabled.'
      setUploadError(msg)
      toast('error', 'Cover photo upload failed')
    } else {
      const { data: urlData } = supabase.storage.from('survey-photos').getPublicUrl(path)
      updateFormData({ cover_photo_url: urlData.publicUrl })
      toast('success', 'Cover photo uploaded')
    }
    setUploading(false)
  }

  return (
    <div>
      <div className="section-title">General Information</div>
      <div className="form-grid-2" style={{ marginBottom: 20 }}>
        <Input
          label="REF Number"
          value={formData.ref_number || ''}
          onChange={e => updateFormData({ ref_number: e.target.value })}
          placeholder="302/2025"
          required
        />
        <Input
          label="Survey Type"
          value="Bunker Quantity Survey"
          readOnly
          disabled
        />
      </div>
      <div className="form-grid-2" style={{ marginBottom: 20 }}>
        <Input
          label="Vessel Name"
          value={formData.vessel_name || ''}
          onChange={e => updateFormData({ vessel_name: e.target.value })}
          placeholder="MV BENEFACTOR"
          required
        />
        <Input
          label="Port"
          value={formData.port || ''}
          onChange={e => updateFormData({ port: e.target.value })}
          placeholder="Santos Port"
        />
      </div>
      <div className="form-grid-2" style={{ marginBottom: 28 }}>
        <Input
          label="Survey Date"
          type="date"
          value={formData.survey_date || ''}
          onChange={e => updateFormData({ survey_date: e.target.value })}
        />
      </div>

      <div className="section-title">Cover Photo</div>

      {uploadError && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--red-100)', border: '1px solid var(--red-border)', borderRadius: 3, padding: '10px 14px', marginBottom: 12 }}>
          <AlertCircle size={16} style={{ color: 'var(--red-600)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--red-600)' }}>{uploadError}</span>
        </div>
      )}

      {formData.cover_photo_url ? (
        <div style={{ position: 'relative', width: '100%', maxWidth: 480, marginBottom: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={formData.cover_photo_url}
            alt="Cover photo"
            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 3, border: '1px solid var(--border-default)', display: 'block' }}
          />
          <button
            onClick={() => updateFormData({ cover_photo_url: '' })}
            style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(10,22,40,0.7)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Remove cover photo"
          >
            <X size={14} color="#FFF" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed var(--navy-300)',
            borderRadius: 3,
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            maxWidth: 480,
            marginBottom: 12,
            background: 'var(--bg-surface)',
          }}
          role="button"
          aria-label="Upload cover photo"
        >
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span className="spinner spinner-blue" style={{ width: 24, height: 24 }} />
              <span style={{ color: 'var(--navy-500)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Uploading...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
              <UploadCloud size={28} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Click to upload cover photo</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Shown on the PDF cover page</span>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => { if (e.target.files?.[0]) handleCoverPhoto(e.target.files[0]) }}
      />
    </div>
  )
}
