'use client'
import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types'
import { DEMO_USERS } from './demo-data'
import { createClient, isDemoMode } from './supabase'

export type LoginResult = {
  success: boolean
  error?: string
  /** Maps to a localized key the UI can resolve to either language. */
  errorCode?:
    | 'invalid_credentials'
    | 'missing_fields'
    | 'account_locked'
    | 'account_inactive'
    | 'account_pending'
    | 'network'
    | 'unknown'
  /** True when the user must change a temporary or first-login password. */
  mustChangePassword?: boolean
  /** Convenience copy of the resolved Profile (also stored in state). */
  user?: Profile
}

interface AuthState {
  user: Profile | null
  isAuthenticated: boolean
  isLoading: boolean
  mustChangePassword: boolean
  /** Last successfully-used identifier, surfaced for the "Remember me" hint. */
  lastIdentifier: string | null
  login: (
    identifier: string,
    password: string,
    opts?: { remember?: boolean },
  ) => Promise<LoginResult>
  logout: () => Promise<void>
  hydrate: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => void
  clearMustChangePassword: () => void
}

// ---------- Demo-mode credentials catalogue ----------
// Production note: in real Supabase mode, passwords live in `auth.users` and
// are never seen by the client. The demo list below is only used while
// NEXT_PUBLIC_DEMO_MODE=true to power local previews without a backend.
//
// `ASas123456ASas` is the fixed login password for Sultan Alallah (Super
// Admin) and Afnan Bakri (Admin). The first-login force-change flow was
// removed per the operator's request — `mustChangePassword` always resolves
// to `false`, so login never bounces to `/change-password`. Users can still
// visit that route voluntarily to update their password.
const DEMO_PASSWORDS: Record<string, string[]> = {
  // Super Admin — Sultan Alallah
  'sultan.alallah':     ['ASas123456ASas', 'PMNH@Research2024!', 'admin123', 'demo'],
  'admin@pmnh.gov.sa':  ['ASas123456ASas', 'PMNH@Research2024!', 'admin123', 'demo'],
  // Admin — Afnan Bakri
  'afnan.bakri':        ['ASas123456ASas', 'demo', 'Demo@1234'],
  'bkriafnan@gmail.com':['ASas123456ASas', 'demo', 'Demo@1234'],
  // Back-compat with the old hard-coded admin username from earlier seed data
  'research-unit PMNH': ['ASas123456ASas', 'PMNH@Research2024!', 'admin123', 'demo'],
}
const DEMO_USER_FALLBACK_PASSWORDS = ['demo', 'Demo@1234']

function matchDemoUser(identifier: string, password: string): Profile | null {
  const id = identifier.trim()
  const accepted = DEMO_PASSWORDS[id]
  if (accepted && accepted.includes(password)) {
    return DEMO_USERS.find(u => u.username === id || u.email === id) || DEMO_USERS[0]
  }
  const candidate = DEMO_USERS.find(u => u.username === id || u.email === id)
  if (candidate && DEMO_USER_FALLBACK_PASSWORDS.includes(password)) return candidate
  return null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      mustChangePassword: false,
      lastIdentifier: null,

      login: async (identifier, password, opts) => {
        const ident = identifier.trim()
        if (!ident || !password) {
          return { success: false, error: 'Missing fields', errorCode: 'missing_fields' }
        }

        set({ isLoading: true })

        try {
          // -------- DEMO MODE PATH --------
          if (isDemoMode) {
            // Small artificial latency so the spinner is visible.
            await new Promise(r => setTimeout(r, 600))
            const demoUser = matchDemoUser(ident, password)
            if (!demoUser) {
              set({ isLoading: false })
              return { success: false, error: 'Invalid username or password.', errorCode: 'invalid_credentials' }
            }
            // Force-change-on-first-login was removed. Always allow straight access.
            set({
              user: demoUser,
              isAuthenticated: true,
              isLoading: false,
              mustChangePassword: false,
              lastIdentifier: opts?.remember ? ident : null,
            })
            return { success: true, mustChangePassword: false, user: demoUser }
          }

          // -------- SUPABASE PATH --------
          const supabase = createClient()
          if (!supabase) {
            set({ isLoading: false })
            return { success: false, error: 'Authentication service unavailable.', errorCode: 'network' }
          }

          // Allow login by username OR email. Resolve username → email by
          // calling a SECURITY DEFINER RPC (`lookup_email_by_username`) which
          // bypasses RLS for this single safe read. See 002_auth_helpers.sql.
          let email = ident
          if (!ident.includes('@')) {
            const { data: emailRow, error: lookupErr } = await supabase
              .rpc('lookup_email_by_username', { p_username: ident })
            if (lookupErr) {
              set({ isLoading: false })
              return {
                success: false,
                // Make the migration-missing case obvious in the toast.
                error: lookupErr.message.includes('function') || lookupErr.message.includes('not exist')
                  ? 'Database not migrated — apply supabase/migrations/002_auth_helpers.sql then retry.'
                  : `Lookup failed: ${lookupErr.message}`,
                errorCode: 'unknown',
              }
            }
            if (!emailRow) {
              set({ isLoading: false })
              return { success: false, error: 'Invalid username or password.', errorCode: 'invalid_credentials' }
            }
            email = String(emailRow)
          }

          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error || !data.user) {
            set({ isLoading: false })
            return {
              success: false,
              error: error?.message || 'Invalid username or password.',
              errorCode: 'invalid_credentials',
            }
          }

          // Fetch the profile row.
          let profile: Profile | null = null
          {
            const { data: row, error: profileErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle()
            if (profileErr) {
              await supabase.auth.signOut()
              set({ isLoading: false })
              return { success: false, error: `Profile read failed: ${profileErr.message}`, errorCode: 'unknown' }
            }
            profile = row as Profile | null
          }

          // Safety net: the on_auth_user_created trigger should have created
          // the row, but if the migration wasn't applied OR an earlier auth
          // user predates the trigger, create the profile inline now so the
          // user isn't trapped at the login screen.
          if (!profile) {
            const username = data.user.email?.split('@')[0] || data.user.id.slice(0, 8)
            const { data: created, error: createErr } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                email: data.user.email,
                username,
                full_name: data.user.user_metadata?.full_name || username,
                role: 'authorized_staff',
                is_active: true,
                email_verified: !!data.user.email_confirmed_at,
                login_count: 0,
              })
              .select('*')
              .single()
            if (createErr || !created) {
              await supabase.auth.signOut()
              set({ isLoading: false })
              return {
                success: false,
                error: `Could not bootstrap profile: ${createErr?.message ?? 'unknown'}. Apply 002_auth_helpers.sql.`,
                errorCode: 'unknown',
              }
            }
            profile = created as Profile
          }

          if (!profile.is_active) {
            await supabase.auth.signOut()
            set({ isLoading: false })
            return { success: false, error: 'Account is inactive. Contact administrator.', errorCode: 'account_inactive' }
          }
          if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
            await supabase.auth.signOut()
            set({ isLoading: false })
            return { success: false, error: 'Account temporarily locked.', errorCode: 'account_locked' }
          }

          // Force-change-on-first-login was removed: the password is fixed
          // and there is no temporary credential to swap. `mustChangePassword`
          // stays false so the user goes straight to the dashboard.

          // Best-effort bookkeeping; don't fail login if this update fails.
          supabase
            .from('profiles')
            .update({
              last_login: new Date().toISOString(),
              login_count: (profile.login_count ?? 0) + 1,
              failed_login_attempts: 0,
            })
            .eq('id', profile.id)
            .then(() => undefined)

          set({
            user: profile,
            isAuthenticated: true,
            isLoading: false,
            mustChangePassword: false,
            lastIdentifier: opts?.remember ? ident : null,
          })
          return { success: true, mustChangePassword: false, user: profile }
        } catch {
          set({ isLoading: false })
          return { success: false, error: 'Network error. Please try again.', errorCode: 'network' }
        }
      },

      logout: async () => {
        if (!isDemoMode) {
          const supabase = createClient()
          try { await supabase?.auth.signOut() } catch { /* ignore */ }
        }
        set({ user: null, isAuthenticated: false, mustChangePassword: false })
      },

      hydrate: async () => {
        if (isDemoMode) return
        const supabase = createClient()
        if (!supabase) return
        try {
          // If a stale demo-mode session is sitting in localStorage (e.g.
          // user.id is "u1" — not a UUID), the Supabase client would still
          // think someone is signed in but every write to a UUID-typed
          // column would silently fail RLS. Clear it up front.
          const current = get().user
          const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (current && !UUID_RE.test(current.id)) {
            set({ user: null, isAuthenticated: false, mustChangePassword: false })
          }

          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.user) {
            set({ user: null, isAuthenticated: false, mustChangePassword: false })
            return
          }
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
          if (profile?.is_active) {
            // Always clear `mustChangePassword` on hydrate so any stale `true`
            // value left in localStorage from the removed force-change flow
            // can't bounce the user to /change-password on refresh.
            set({ user: profile as Profile, isAuthenticated: true, mustChangePassword: false })
          } else {
            await supabase.auth.signOut()
            set({ user: null, isAuthenticated: false, mustChangePassword: false })
          }
        } catch (e) {
          // Visible in DevTools — silent failures here were the root of the
          // "page looks logged in but writes 403" symptom.
          console.error('[auth-store.hydrate]', e)
        }
      },

      updateProfile: (updates) => {
        const current = get().user
        if (current) set({ user: { ...current, ...updates } })
      },

      clearMustChangePassword: () => set({ mustChangePassword: false }),
    }),
    {
      name: 'pmnh-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        mustChangePassword: state.mustChangePassword,
        lastIdentifier: state.lastIdentifier,
      }),
    },
  ),
)

/**
 * Run-once-per-app hook that:
 *   1. Calls `hydrate()` so a refreshed page validates its persisted Zustand
 *      state against the actual Supabase session (kicks the user out if the
 *      JWT was revoked or expired).
 *   2. Subscribes to `auth.onAuthStateChange` so a sign-out from another tab,
 *      a silent token refresh, or a session expiry all keep the store in sync.
 *
 * Call from a layout-level Client Component so it mounts once per session.
 */
export function useAuthHydrate(): void {
  useEffect(() => {
    void useAuthStore.getState().hydrate()
    if (isDemoMode) return

    const supabase = createClient()
    if (!supabase) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          useAuthStore.setState({
            user: null,
            isAuthenticated: false,
            mustChangePassword: false,
          })
          return
        }
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'SIGNED_IN') {
          // Re-fetch the profile so role / status changes elsewhere flow in.
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
          if (profile) {
            useAuthStore.setState({
              user: profile as Profile,
              isAuthenticated: true,
            })
          }
        }
      },
    )
    return () => subscription.unsubscribe()
  }, [])
}
