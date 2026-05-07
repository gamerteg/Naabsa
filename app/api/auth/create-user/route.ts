import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveUser } from '@/lib/server/auth'

export async function POST(req: Request) {
  const auth = await requireActiveUser(['gestor'])
  if ('response' in auth) return auth.response
  const { user } = auth

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, password, full_name, role } = body as {
    email: unknown
    password: unknown
    full_name: unknown
    role: unknown
  }

  // Validação manual dos campos obrigatórios
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    return NextResponse.json({ error: 'full_name must be at least 2 characters' }, { status: 400 })
  }
  if (role !== undefined && role !== 'colaborador' && role !== 'gestor') {
    return NextResponse.json({ error: 'role must be "colaborador" or "gestor"' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const { error: profileError } = await admin.from('profiles').insert({
    id: authUser.user.id,
    email,
    full_name: full_name.trim(),
    role: role || 'colaborador',
    must_change_password: true,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  await admin.from('report_activity_log').insert({
    user_id: user.id,
    action: 'user_created',
    details: { created_user_id: authUser.user.id, email, role: role || 'colaborador', must_change_password: true },
  })

  return NextResponse.json({ success: true, user: { id: authUser.user.id, email, full_name, must_change_password: true } }, { status: 201 })
}
