'use client'
import { useRef, useState } from 'react'
import { UploadCloud, X, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastProvider'
import type { PhotoItem } from '@/lib/types'

interface PhotoUploaderProps {
  photos: PhotoItem[]
  category: PhotoItem['category']
  reportId: string
  onChange: (photos: PhotoItem[]) => void
  readOnly?: boolean
}

const CATEGORY_LABELS: Record<PhotoItem['category'], string> = {
  vessel_tanks: 'Vessel Tanks — Opening Soundings',
  barge_tanks: "Barge Tanks — Opening Soundings",
  sampling: 'Sampling',
}

export function PhotoUploader({ photos, category, reportId, onChange, readOnly }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const toast = useToast()
  const categoryPhotos = photos.filter(p => p.category === category)

  async function handleFiles(files: File[]) {
    setUploading(true)
    setUploadError(null)
    const newPhotos: PhotoItem[] = [...photos]
    let failed = 0

    for (const file of files) {
      const id = crypto.randomUUID()
      // Sanitize filename to avoid path issues
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${reportId}/${category}/${id}-${safeName}`
      const { data, error } = await supabase.storage.from('survey-photos').upload(path, file, { upsert: true })

      if (error) {
        console.error('Upload error:', error)
        failed++
      } else if (data) {
        const { data: urlData } = supabase.storage.from('survey-photos').getPublicUrl(path)
        newPhotos.push({ id, url: urlData.publicUrl, caption: '', category })
      }
    }

    if (failed > 0) {
      const msg = failed === files.length
        ? 'Upload failed. Check that the storage bucket "survey-photos" exists and has upload policies enabled.'
        : `${failed} of ${files.length} file(s) failed to upload.`
      setUploadError(msg)
      toast('error', `Photo upload failed (${failed} file${failed > 1 ? 's' : ''})`)
    } else if (files.length > 0) {
      toast('success', `${files.length} photo${files.length > 1 ? 's' : ''} uploaded`)
    }

    onChange(newPhotos)
    setUploading(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length) handleFiles(files)
  }

  function removePhoto(id: string) {
    onChange(photos.filter(p => p.id !== id))
  }

  function updateCaption(id: string, caption: string) {
    onChange(photos.map(p => p.id === id ? { ...p, caption } : p))
  }

  return (
    <div>
      <div className="section-title" style={{ fontSize: 'var(--text-base)' }}>{CATEGORY_LABELS[category]}</div>

      {uploadError && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--red-100)', border: '1px solid var(--red-border)', borderRadius: 3, padding: '10px 14px', marginBottom: 12 }}>
          <AlertCircle size={16} style={{ color: 'var(--red-600)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--red-600)' }}>{uploadError}</span>
        </div>
      )}

      {!readOnly && (
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed var(--navy-300)',
            borderRadius: 3,
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: 16,
            background: 'var(--bg-surface)',
            transition: 'border-color 150ms, background 150ms',
          }}
          role="button"
          aria-label={`Upload ${CATEGORY_LABELS[category]} photos`}
        >
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span className="spinner spinner-blue" style={{ width: 24, height: 24 }} />
              <span style={{ color: 'var(--navy-500)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>Uploading...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
              <UploadCloud size={28} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Drop photos here or click to browse</span>
            </div>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple hidden
        onChange={e => { if (e.target.files) handleFiles(Array.from(e.target.files)) }}
      />

      {categoryPhotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {categoryPhotos.map(p => (
            <div key={p.id} style={{ border: '1px solid var(--border-default)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--bg-elevated)' }}>
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={p.caption || 'Survey photo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    <ImageIcon size={32} />
                  </div>
                )}
                {!readOnly && (
                  <button
                    onClick={() => removePhoto(p.id)}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(10,22,40,0.7)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label="Remove photo"
                  >
                    <X size={12} color="#FFF" />
                  </button>
                )}
              </div>
              <div style={{ padding: '8px 10px' }}>
                <input
                  className="field-input"
                  type="text"
                  value={p.caption}
                  placeholder="Add caption..."
                  readOnly={readOnly}
                  onChange={e => updateCaption(p.id, e.target.value)}
                  style={{ fontSize: 'var(--text-sm)' }}
                  aria-label="Photo caption"
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {categoryPhotos.length === 0 && readOnly && (
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontStyle: 'italic' }}>No photos in this category.</div>
      )}
    </div>
  )
}
