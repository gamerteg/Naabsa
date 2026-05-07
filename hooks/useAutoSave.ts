'use client'
import { useRef, useEffect, useCallback } from 'react'
import type { SaveStatus } from '@/lib/types'

interface UseAutoSaveOptions<T> {
  data: T
  reportId: string
  onSave: (data: T) => Promise<void>
  onStatusChange: (status: SaveStatus) => void
  debounceMs?: number
}

export function useAutoSave<T>({ data, reportId, onSave, onStatusChange, debounceMs = 5000 }: UseAutoSaveOptions<T>) {
  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dataRef = useRef(data)

  const saveNowRef = useRef<() => Promise<void>>(async () => {})

  const saveNow = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    onStatusChange('saving')
    try {
      await onSave(dataRef.current)
      onStatusChange('saved')
      dirtyRef.current = false
    } catch {
      onStatusChange('error')
      throw new Error('save failed')
    }
  }, [onSave, onStatusChange])

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    saveNowRef.current = saveNow
  }, [saveNow])

  const markDirty = useCallback(() => {
    dirtyRef.current = true
    onStatusChange('saving')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => saveNowRef.current(), debounceMs)
  }, [onStatusChange, debounceMs])

  useEffect(() => {
    function handleBeforeUnload() {
      if (!dirtyRef.current) return
      // navigator.sendBeacon é síncrono do ponto de vista do browser — não é
      // cancelado no unload, ao contrário de fetch(). Envia os dados pendentes
      // como best-effort antes do tab fechar.
      const payload = JSON.stringify({ form_data: dataRef.current })
      navigator.sendBeacon(`/api/reports/${reportId}/autosave`, new Blob([payload], { type: 'application/json' }))
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [reportId])

  return { saveNow, markDirty }
}
