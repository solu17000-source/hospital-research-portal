import { createBrowserClient } from '@supabase/ssr'
import { createServerClient as createSSRServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !supabaseUrl || !supabaseAnonKey

export function createClient() {
  if (isDemoMode) return null as unknown as ReturnType<typeof createBrowserClient>
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
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
