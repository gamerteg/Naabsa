'use client'
import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'
import type { AppNotification } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  assignment: 'Atribuicao',
  revision_requested: 'Correcao solicitada',
  submitted_for_review: 'Enviado para revisao',
  report_approved: 'Relatorio finalizado',
  reminder: 'Lembrete',
}

export function NotificationBell() {
  const { user } = useAuth()
  const { notifications, unreadCount, markAllRead } = useNotifications(user?.id)
  const [open, setOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle() {
    setOpen(prev => {
      if (!prev && unreadCount > 0) markAllRead()
      return !prev
    })
  }

  return (
    <div ref={dropRef} style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost btn-icon"
        onClick={toggle}
        style={{ color: 'var(--navy-300)', position: 'relative' }}
        aria-label={`Notificacoes - ${unreadCount} nao lidas`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 16, height: 16, borderRadius: '50%',
            background: 'var(--red-600)', color: '#FFF',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div style={{
            padding: '12px 16px 10px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--navy-700)' }}>
              Notificacoes
            </span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-500)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Marcar todas como lidas
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              Nenhuma notificacao
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {notifications.map((n: AppNotification) => (
                <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--navy-500)', marginBottom: 2 }}>
                    {TYPE_LABELS[n.type] || n.type}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{n.message}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
