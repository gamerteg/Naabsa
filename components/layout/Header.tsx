'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'

import { NotificationBell } from './NotificationBell'

function getBreadcrumb(pathname: string, dashboardHref: string): { label: string; href?: string }[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; href?: string }[] = [{ label: 'Esteira', href: dashboardHref }]

  if (segments.includes('gestor')) crumbs[0] = { label: 'Esteira', href: '/dashboard/gestor' }
  if (segments.includes('colaborador')) crumbs[0] = { label: 'Minha Esteira', href: '/dashboard/colaborador' }

  if (segments.includes('equipe')) crumbs.push({ label: 'Equipe' })
  if (segments.includes('historico')) crumbs.push({ label: 'Historico' })
  if (segments.includes('new')) crumbs.push({ label: 'Importar Planilha' })
  if (segments.includes('edit')) crumbs.push({ label: 'Revisar Relatorio' })
  if (segments.includes('review')) crumbs.push({ label: 'Revisao Gestor' })

  return crumbs
}

export function Header({ vesselName, refNumber }: { vesselName?: string; refNumber?: string }) {
  const pathname = usePathname()
  const { profile } = useAuth()
  const dashboardHref =
    profile?.role === 'gestor'
      ? '/dashboard/gestor'
      : profile?.role === 'colaborador'
        ? '/dashboard/colaborador'
        : '/dashboard'
  const crumbs = getBreadcrumb(pathname, dashboardHref)

  if (vesselName) crumbs.push({ label: `${vesselName}${refNumber ? ` [${refNumber}]` : ''}` })

  return (
    <header className="app-header">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        {crumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {index > 0 && <span className="breadcrumb-sep" aria-hidden="true">&gt;</span>}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className={index === crumbs.length - 1 ? 'breadcrumb-current' : ''}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={index === crumbs.length - 1 ? 'breadcrumb-current' : ''}>{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <NotificationBell />
    </header>
  )
}
