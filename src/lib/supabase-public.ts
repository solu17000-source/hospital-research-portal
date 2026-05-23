import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-safe Supabase client for ANON / PUBLIC reads only.
 *
 * Used by Server Components on public pages (e.g. the marketing homepage and
 * the visitor portal) that need to read approved public records without
 * carrying a user session. RLS on the database is the only thing protecting
 * private rows from this client, so make sure every table queried here has
 * RLS policies that gate on a public/approved flag.
 *
 * Returns `null` when the project is running in demo mode or the env vars
 * are missing so callers can transparently fall back to demo data.
 */
export function createPublicClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-portal-context': 'public-anon' } },
  })
}
