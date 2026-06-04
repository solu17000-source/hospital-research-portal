import { createBrowserClient } from '@supabase/ssr'
import { createServerClient as createSSRServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // The portal is wired to Supabase as the single source of truth — no demo
  // fallback. If credentials are missing the operator should know at boot
  // rather than silently see empty pages.
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are required. ' +
    'Set them in .env.local for local development, or in Vercel project settings.',
  )
}

/**
 * @deprecated The demo-mode branch was removed entirely. This constant is
 * pinned to `false` only so older `if (isDemoMode)` call sites compile while
 * they are progressively cleaned up — they are now dead code.
 */
export const isDemoMode = false as const

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
  if (_browserClient) return _browserClient
  _browserClient = createBrowserClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Dedicated storage key so it can't collide with anything else.
      storageKey: 'sb-pmnh-auth',
    },
  })
  return _browserClient
}

/**
 * Cache-busting one-shot client.
 *
 * Builds a brand-new `createBrowserClient` per call (NOT the singleton),
 * with the auth-store interactions disabled and an `X-Cache-Bust` header
 * carrying the current epoch ms. Used by fetchers where the operator wants
 * to be 100% sure the response is fresh — bypassing any potential
 * client-instance state and tagging the request so intermediate proxies
 * can't serve a cached body.
 *
 * Trade-off: every call sets up new socket/HTTP state, so this is slower
 * than the singleton on a per-request basis. Only worth it for the small
 * reference tables (departments) where stale data has been a persistent
 * pain point.
 */
export function createFreshClient() {
  return createBrowserClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Cache-Bust': String(Date.now()),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    },
  })
}

export function createServerClient(cookieStore: {
  get(name: string): { value: string } | undefined
  set(name: string, value: string, options: CookieOptions): void
  delete(name: string, options: CookieOptions): void
}) {
  return createSSRServerClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
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
  const supabase = createSSRServerClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
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
