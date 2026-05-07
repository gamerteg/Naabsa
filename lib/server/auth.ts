import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

import type { Role } from '@/lib/types'
import { createClient } from '@/lib/supabase/server'

interface ActiveProfile {
  id: string
  role: Role
  is_active: boolean
  must_change_password?: boolean
  full_name: string | null
  email: string
}

interface AuthorizedActor {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: User
  profile: ActiveProfile
}

interface AuthorizationFailure {
  response: NextResponse
}

export async function requireActiveUser(
  allowedRoles?: Role[]
): Promise<AuthorizedActor | AuthorizationFailure> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, is_active, must_change_password, full_name, email')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return { response: NextResponse.json({ error: 'Profile not found' }, { status: 403 }) }
  }

  if (!profile.is_active) {
    return { response: NextResponse.json({ error: 'Inactive user' }, { status: 403 }) }
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, user, profile }
}
