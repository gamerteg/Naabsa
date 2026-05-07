// lib/supabase/admin.ts
// Server-only. Uses service role key to bypass RLS.

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!url) throw new Error('[NAABSA] NEXT_PUBLIC_SUPABASE_URL is not set.')
  if (!serviceKey) throw new Error(
    '[NAABSA] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
    'Get it from: Supabase Dashboard → Project Settings → API → service_role key'
  )

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
