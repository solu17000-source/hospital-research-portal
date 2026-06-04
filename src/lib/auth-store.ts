'use client'
import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types'
import { createClient } from './supabase'

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
  /** Convenience copy of the resolved Profile (also stored in state). */
  user?: Profile
}

interface AuthState {
  user: Profile | null
  isAuthenticated: boolean
  isLoading: boolean
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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      lastIdentifier: null,

      login: async (identifier, password, opts) => {
        const ident = identifier.trim()
        if (!ident || !password) {
          return { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور.', errorCode: 'missing_fields' }
        }

        set({ isLoading: true })

        try {
          const supabase = createClient()

          // Username login → resolve to email via SECURITY DEFINER RPC.
          let email = ident
          if (!ident.includes('@')) {
            const { data: emailRow, error: lookupErr } = await supabase
              .rpc('lookup_email_by_username', { p_username: ident })
            if (lookupErr) {
              set({ isLoading: false })
              return {
                success: false,
                error: lookupErr.message,
                errorCode: 'unknown',
              }
            }
            if (!emailRow) {
              set({ isLoading: false })
              return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.', errorCode: 'invalid_credentials' }
            }
            email = String(emailRow)
          }

          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error || !data.user) {
            set({ isLoading: false })
            return {
              success: false,
              error: error?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة.',
              errorCode: 'invalid_credentials',
            }
          }

          // CRITICAL — verify the session is actually established before
          // setting `isAuthenticated`. signInWithPassword can return a
          // user object while the session-token write to storage races
          // with the redirect, especially after a sign-out + sign-in
          // cycle. That leaves Zustand persisting isAuthenticated=true
          // while supabase-js holds no usable token, and every later
          // write hangs on `auth.uid() = null` at the RLS layer.
          //
          // We poll the session up to 3 times (≈400ms total) and try
          // one explicit refreshSession() before giving up. If the
          // session still isn't there we bail out cleanly so the UI
          // can re-prompt instead of dropping the user into a broken
          // signed-in state.
          let verifiedSession: typeof data.session | null = data.session
          if (!verifiedSession?.access_token) {
            for (let i = 0; i < 3; i++) {
              await new Promise(r => setTimeout(r, 100))
              const s = (await supabase.auth.getSession()).data.session
              if (s?.access_token) { verifiedSession = s; break }
            }
          }
          if (!verifiedSession?.access_token) {
            const refreshed = await supabase.auth.refreshSession()
            verifiedSession = refreshed.data.session ?? null
          }
          if (!verifiedSession?.access_token) {
            await supabase.auth.signOut()
            set({ isLoading: false })
            return {
              success: false,
              error: 'تعذّر تأسيس الجلسة في المتصفح. أعد المحاولة.',
              errorCode: 'unknown',
            }
          }
          console.info('[auth-store.login] session established, access_token length:', verifiedSession.access_token.length)

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
              return { success: false, error: profileErr.message, errorCode: 'unknown' }
            }
            profile = row as Profile | null
          }

          // Safety net: if the on_auth_user_created trigger didn't run, build
          // the profile inline so the user isn't stranded.
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
                error: createErr?.message ?? 'تعذّر إنشاء الملف الشخصي.',
                errorCode: 'unknown',
              }
            }
            profile = created as Profile
          }

          if (!profile.is_active) {
            await supabase.auth.signOut()
            set({ isLoading: false })
            return { success: false, error: 'الحساب غير مفعّل. تواصل مع المسؤول.', errorCode: 'account_inactive' }
          }
          if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
            await supabase.auth.signOut()
            set({ isLoading: false })
            return { success: false, error: 'الحساب مغلق مؤقتًا.', errorCode: 'account_locked' }
          }

          // Best-effort login bookkeeping; never fail login on update error.
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
            lastIdentifier: opts?.remember ? ident : null,
          })
          return { success: true, user: profile }
        } catch (e) {
          console.error('[auth-store.login] threw:', e)
          set({ isLoading: false })
          return { success: false, error: 'خطأ في الشبكة. حاول مرة أخرى.', errorCode: 'network' }
        }
      },

      logout: async () => {
        const supabase = createClient()
        try { await supabase.auth.signOut() } catch { /* ignore */ }
        set({ user: null, isAuthenticated: false, lastIdentifier: null })
        // Belt-and-suspenders: blow away every persisted auth blob so a
        // subsequent sign-in starts from a truly clean slate. Without
        // this, Zustand's `pmnh-auth` key and supabase-js's
        // `sb-pmnh-auth` key can drift apart on the next session and
        // produce the "isAuthenticated:true / hasSession:false" mismatch.
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('pmnh-auth')
            localStorage.removeItem('sb-pmnh-auth-token')
            // Also clear any sb-* keys defensively — supabase-js can
            // create per-instance keys in some edge cases.
            for (const k of Object.keys(localStorage)) {
              if (k.startsWith('sb-pmnh-auth')) localStorage.removeItem(k)
            }
          } catch { /* ignore */ }
        }
      },

      hydrate: async () => {
        const supabase = createClient()
        try {
          // Drop any persisted user whose id isn't a real UUID — that's a
          // leftover from a previous demo build and would silently fail RLS.
          const current = get().user
          const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (current && !UUID_RE.test(current.id)) {
            set({ user: null, isAuthenticated: false })
          }

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
        } catch (e) {
          console.error('[auth-store.hydrate]', e)
        }
      },

      updateProfile: (updates) => {
        const current = get().user
        if (current) set({ user: { ...current, ...updates } })
      },
    }),
    {
      name: 'pmnh-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
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
 */
export function useAuthHydrate(): void {
  useEffect(() => {
    void useAuthStore.getState().hydrate()

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          useAuthStore.setState({
            user: null,
            isAuthenticated: false,
          })
          return
        }
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'SIGNED_IN') {
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
