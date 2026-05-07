'use client'
import { useAuth } from '@/contexts/AuthContext'

export function usePermissions() {
  const { profile } = useAuth()
  const isGestor = profile?.role === 'gestor'

  return {
    isGestor,
    canEdit: !!profile?.is_active,
    canApprove: isGestor,
    canAssign: isGestor,
    canDelete: isGestor,
    canExportPdf: isGestor,
    canManageUsers: isGestor,
  }
}
