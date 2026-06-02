import { createBrowserClient } from '@supabase/ssr'
import { createServerClient as createSSRServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !supabaseUrl || !supabaseAnonKey

/**
 * One shared browser client per session.
 *
 * Before this was cached, every call to `createClient()` returned a fresh
 * `createBrowserClient` instance — which meant the post-sign-in `session`
 * lived only on whichever instance happened to run `signInWithPassword`.
 * Later instances called for writes had no session in memory, so the JWT
 * was never attached to the request and `auth.uid()` came back null on
 * the server, blowing up every RLS-checked INSERT / UPDATE / DELETE.
 *
 * Caching at module level pins the auth state across every call site, and
 * tells @supabase/ssr to enable token auto-refresh + cookie-backed storage
 * so navigating between pages keeps the user signed in.
 */
let _browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (isDemoMode) return null as unknown as ReturnType<typeof createBrowserClient>
  if (_browserClient) return _browserClient
  _browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Use a dedicated storage key so it can't collide with anything else.
      storageKey: 'sb-pmnh-auth',
    },
  })
  return _browserClient
}

export function createServerClient(cookieStore: {
  get(name: string): { value: string } | undefined
  set(name: string, value: string, options: CookieOptions): void
  delete(name: string, options: CookieOptions): void
}) {
  if (isDemoMode) return null as unknown as ReturnType<typeof createSSRServerClient>
  return createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set(name, value, options)
        } catch {}
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.delete(name, options)
        } catch {}
      },
    },
  })
}

export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })
  if (isDemoMode) return { supabase: null, response }
  const supabase = createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options })
        response = NextResponse.next({ request: { headers: request.headers } })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options })
        response = NextResponse.next({ request: { headers: request.headers } })
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })
  return { supabase, response }
}
