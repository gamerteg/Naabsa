'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/ToastProvider'

export default function ChangePasswordPage() {
  const router = useRouter()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('A nova senha precisa ter pelo menos 8 caracteres.')
      return
    }

    if (password !== confirm) {
      setError('As senhas nao conferem.')
      return
    }

    setLoading(true)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Nao foi possivel atualizar a senha.')
      return
    }

    toast('success', 'Senha atualizada. Acesso liberado.')
    router.push('/')
  }

  return (
    <div className="login-bg">
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 4, background: 'var(--navy-900)', marginBottom: 14 }}>
            <KeyRound size={26} color="var(--red-600)" />
          </div>
          <h1 style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", color: 'var(--navy-900)', fontSize: 'var(--text-xl)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Trocar senha temporaria
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 8 }}>
            Defina uma senha permanente antes de continuar.
          </p>
        </div>

        <div className="login-card">
          {error && (
            <div className="ops-alert danger" role="alert" style={{ marginBottom: 18 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Input
              id="new-password"
              label="Nova senha"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
            <Input
              id="confirm-password"
              label="Confirmar senha"
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
              required
            />
            <Button type="submit" variant="primary" loading={loading} style={{ width: '100%' }}>
              <ShieldCheck size={14} /> Atualizar senha
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
