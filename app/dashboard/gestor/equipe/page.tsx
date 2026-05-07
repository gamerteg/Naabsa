'use client'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/ToastProvider'
import { KeyRound, UserPlus, ToggleRight, ToggleLeft } from 'lucide-react'
import type { Profile } from '@/lib/types'

export default function EquipePage() {
  const [collaborators, setCollaborators] = useState<Profile[]>([])
  const [newUserOpen, setNewUserOpen] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'colaborador' })
  const toast = useToast()

  const load = useCallback(async () => {
    const res = await fetch('/api/profiles?role=colaborador,gestor')
    if (!res.ok) return
    const data: Profile[] = await res.json()
    setCollaborators(data || [])
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/profiles?role=colaborador,gestor')
      .then(async (res) => {
        if (!res.ok) return []
        return res.json() as Promise<Profile[]>
      })
      .then((data) => {
        if (active) setCollaborators(data || [])
      })

    return () => {
      active = false
    }
  }, [])

  async function handleCreate() {
    setLoading(true)
    const res = await fetch('/api/auth/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      toast('success', `Usuario ${form.full_name} criado`)
      setTempPassword(form.password || data.user?.temporary_password || '')
      setNewUserOpen(false)
      setForm({ full_name: '', email: '', password: '', role: 'colaborador' })
      load()
    } else {
      const err = await res.json()
      toast('error', err.error || 'Nao foi possivel criar o usuario')
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/profiles/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Nao foi possivel atualizar o status do usuario' }))
      toast('error', err.error || 'Nao foi possivel atualizar o status do usuario')
      return
    }
    toast('info', `Usuario ${current ? 'desativado' : 'ativado'}`)
    void load()
  }

  async function resetPassword(id: string) {
    const res = await fetch('/api/auth/reset-temp-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast('error', data.error || 'Nao foi possivel gerar senha temporaria')
      return
    }
    setTempPassword(data.temporary_password)
    toast('success', 'Senha temporaria gerada')
    void load()
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Equipe</h1>
        <Button variant="primary" onClick={() => setNewUserOpen(true)}>
          <UserPlus size={14} /> Novo usuario
        </Button>
      </div>

      <div className="card-white" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>EMAIL</th>
              <th>ROLE</th>
              <th>STATUS</th>
              <th>SENHA</th>
              <th>LAST SEEN</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {collaborators.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 700 }}>{c.full_name}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{c.email}</td>
                <td><Badge variant={c.role === 'gestor' ? 'info' : 'neutral'}>{c.role}</Badge></td>
                <td><Badge variant={c.is_active ? 'success' : 'danger'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></td>
                <td>
                  <Badge variant={c.must_change_password ? 'warning' : 'success'}>
                    {c.must_change_password ? 'Temp' : 'OK'}
                  </Badge>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  {c.last_seen_at ? new Date(c.last_seen_at).toLocaleDateString() : '—'}
                </td>
                <td>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => toggleActive(c.id, c.is_active)}
                    aria-label={c.is_active ? 'Deactivate user' : 'Activate user'}
                    title={c.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {c.is_active ? <ToggleRight size={16} style={{ color: 'var(--status-success-text)' }} /> : <ToggleLeft size={16} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => resetPassword(c.id)}
                    aria-label={`Reset temporary password for ${c.full_name}`}
                    title="Gerar senha temporaria"
                  >
                    <KeyRound size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {collaborators.length === 0 && (
              <tr><td colSpan={7} className="empty-state">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={newUserOpen} onClose={() => setNewUserOpen(false)} title="New User"
        footer={<>
          <Button variant="ghost" onClick={() => setNewUserOpen(false)}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={handleCreate}>Create User ›</Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Full Name" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          <Input label="Temporary Password" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
          <div className="form-group">
            <label className="field-label">Role</label>
            <select className="field-input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} aria-label="User role">
              <option value="colaborador">Collaborator</option>
              <option value="gestor">Manager</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal open={!!tempPassword} onClose={() => setTempPassword('')} title="Senha temporaria"
        footer={<Button variant="primary" onClick={() => setTempPassword('')}>Entendi</Button>}>
        <div className="ops-alert warning" style={{ marginBottom: 16 }}>
          Entregue esta senha ao usuario por canal seguro. Ela sera exigida apenas ate a primeira troca.
        </div>
        <div style={{ padding: '12px 14px', border: '1px solid var(--border-default)', borderRadius: 3, background: 'var(--bg-elevated)', fontFamily: 'monospace', fontSize: 'var(--text-base)', fontWeight: 700 }}>
          {tempPassword}
        </div>
      </Modal>
    </>
  )
}
