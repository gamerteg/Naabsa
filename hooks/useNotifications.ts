'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AppNotification } from '@/lib/types'
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js'

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const supabase = createClient()

  const unreadCount = notifications.filter(n => !n.read).length

  async function load() {
    if (!userId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifications(data || [])
  }

  async function markAllRead() {
    if (!userId) return
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  useEffect(() => {
    if (!userId) return

    // Subscribir ANTES de carregar para não perder notificações inseridas entre
    // o fetch e a subscrição.
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresInsertPayload<AppNotification>) => {
          setNotifications(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    load()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return { notifications, unreadCount, markAllRead }
}
