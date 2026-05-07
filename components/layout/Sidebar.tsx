'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, FileText, Users, Archive,
  LogOut, Anchor
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const GESTOR_NAV = [
  { href: '/dashboard/gestor', label: 'Esteira', icon: LayoutDashboard },
  { href: '/reports/new', label: 'Importar Planilha', icon: FileText },
  { href: '/dashboard/gestor/equipe', label: 'Equipe', icon: Users },
  { href: '/dashboard/gestor/historico', label: 'Historico', icon: Archive },
]

const COLABORADOR_NAV = [
  { href: '/dashboard/colaborador', label: 'Minha Esteira', icon: LayoutDashboard },
  { href: '/reports/new', label: 'Importar Planilha', icon: FileText },
]

export function Sidebar() {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const nav = profile?.role === 'gestor' ? GESTOR_NAV : COLABORADOR_NAV

  async function handleSignOut() {
    await signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Anchor size={24} color="var(--red-600)" />
          <div>
            <div style={{
              fontFamily: "'Barlow Semi Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 'var(--text-md)',
              color: '#FFFFFF',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              lineHeight: 1.1
            }}>
              NAABSA
            </div>
            <div style={{
              fontFamily: "'Barlow Semi Condensed', sans-serif",
              fontWeight: 600,
              fontSize: 'var(--text-xs)',
              color: 'var(--navy-300)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Sistema de Relatorios
            </div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Navegacao principal">
        <div className="nav-section-label">Operacao</div>
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard/gestor' && href !== '/dashboard/colaborador' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className={`nav-item ${isActive ? 'active' : ''}`} aria-current={isActive ? 'page' : undefined}>
              <Icon size={16} aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '12px 8px 16px', borderTop: '1px solid rgba(168,196,220,0.15)' }}>
        {profile && (
          <div style={{ padding: '8px 12px', marginBottom: 4 }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.02em' }}>
              {profile.full_name}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-300)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {profile.role === 'gestor' ? 'Gestor' : 'Colaborador'}
            </div>
          </div>
        )}
        <button
          onClick={(e) => {
            e.preventDefault()
            void handleSignOut()
          }}
          className="nav-item"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Sair"
        >
          <LogOut size={16} aria-hidden="true" />
          Sair
        </button>
      </div>
    </aside>
  )
}
