'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Anchor, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'

type LoginFormProps = {
  initialError?: string
}

export function LoginForm({ initialError = '' }: LoginFormProps) {
  const { signIn } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) {
      setError('Credenciais invalidas. Confira email e senha.')
      return
    }
    router.push('/')
  }

  return (
    <div className="login-bg">
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 3,
              background: 'var(--navy-900)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Anchor size={28} color="var(--red-600)" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontFamily: "'Barlow Semi Condensed', sans-serif",
                fontWeight: 700, fontSize: 'var(--text-xl)',
                color: 'var(--navy-900)', textTransform: 'uppercase',
                letterSpacing: '0.05em', lineHeight: 1,
              }}>
                NAABSA
              </div>
              <div style={{
                fontFamily: "'Barlow Semi Condensed', sans-serif",
                fontWeight: 600, fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)', textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                Marine Surveyors
              </div>
            </div>
          </div>
          <div style={{
            fontFamily: "'Barlow Semi Condensed', sans-serif",
            fontWeight: 600, fontSize: 'var(--text-base)',
            color: 'var(--navy-700)', textTransform: 'uppercase',
            letterSpacing: '0.15em', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8,
          }}>
            <span style={{ height: 1, width: 40, background: 'var(--border-default)' }} />
            Sistema de Relatorios
            <span style={{ height: 1, width: 40, background: 'var(--border-default)' }} />
          </div>
        </div>

        <div className="login-card">
          {error && (
            <div style={{
              background: 'var(--red-100)',
              border: '1px solid var(--red-border)',
              borderRadius: 3, padding: '12px 14px',
              marginBottom: 20, fontSize: 'var(--text-sm)',
              color: 'var(--red-600)', fontWeight: 600,
            }} role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
              id="login-email"
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="********"
              required
              autoComplete="current-password"
              id="login-password"
            />
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ width: '100%', marginTop: 4 }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <a
              href="mailto:surveyors@naabsa.com"
              style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textDecoration: 'none' }}
            >
              surveyors@naabsa.com
            </a>
          </div>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Shield size={12} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Acesso restrito a equipe autorizada
          </span>
        </div>
      </div>
    </div>
  )
}
