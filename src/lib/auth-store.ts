'use client'
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
// `ASas123456ASas` is the spec's initial setup password for BOTH Sultan
// Alallah (Super Admin) and Afnan Bakri (Admin). Both must change it on
// first login (the `mustChangePassword` flag is gated by login_count === 0).
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
            const mustChange = demoUser.login_count === 0
            set({
              user: demoUser,
              isAuthenticated: true,
              isLoading: false,
              mustChangePassword: mustChange,
              lastIdentifier: opts?.remember ? ident : null,
            })
            return { success: true, mustChangePassword: mustChange, user: demoUser }
          }

          // -------- SUPABASE PATH --------
          const supabase = createClient()
          if (!supabase) {
            set({ isLoading: false })
            return { success: false, error: 'Authentication service unavailable.', errorCode: 'network' }
          }

          // Allow login by username OR email. Resolve username → email via the
          // public profiles row (RLS must permit unauthenticated reads of the
          // `email` column scoped to active rows for this to work).
          let email = ident
          if (!ident.includes('@')) {
            const { data: profileRow } = await supabase
              .from('profiles')
              .select('email')
              .eq('username', ident)
              .eq('is_active', true)
              .maybeSingle()
            if (!profileRow?.email) {
              set({ isLoading: false })
              return { success: false, error: 'Invalid username or password.', errorCode: 'invalid_credentials' }
            }
            email = profileRow.email
          }

          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error || !data.user) {
            set({ isLoading: false })
            return { success: false, error: error?.message || 'Invalid username or password.', errorCode: 'invalid_credentials' }
          }

          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle()

          if (profileErr || !profile) {
            await supabase.auth.signOut()
            set({ isLoading: false })
            return { success: false, error: 'Profile not found.', errorCode: 'unknown' }
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

          // First login (login_count === 0) forces a password change.
          const mustChange = (profile.login_count ?? 0) === 0

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
            user: profile as Profile,
            isAuthenticated: true,
            isLoading: false,
            mustChangePassword: mustChange,
            lastIdentifier: opts?.remember ? ident : null,
          })
          return { success: true, mustChangePassword: mustChange, user: profile as Profile }
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
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.user) {
            set({ user: null, isAuthenticated: false })
            return
          }
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
          if (profile?.is_active) {
            set({ user: profile as Profile, isAuthenticated: true })
          } else {
            await supabase.auth.signOut()
            set({ user: null, isAuthenticated: false })
          }
        } catch { /* ignore */ }
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
