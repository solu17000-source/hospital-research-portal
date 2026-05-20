'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types'
import { DEMO_USERS } from './demo-data'

interface AuthState {
  user: Profile | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateProfile: (updates: Partial<Profile>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true })
        await new Promise(r => setTimeout(r, 800))

        // Demo mode authentication
        const demoUser = DEMO_USERS.find(
          u => u.username === username || u.email === username
        )

        // Default admin credentials
        const isValidAdmin =
          (username === 'research-unit PMNH' || username === 'admin@pmnh.gov.sa') &&
          (password === 'PMNH@Research2024!' || password === 'admin123' || password === 'demo')

        const isValidDemoUser = demoUser && (password === 'demo' || password === 'Demo@1234')

        if (isValidAdmin) {
          const adminUser = DEMO_USERS[0]
          set({ user: adminUser, isAuthenticated: true, isLoading: false })
          return { success: true }
        }

        if (isValidDemoUser) {
          set({ user: demoUser, isAuthenticated: true, isLoading: false })
          return { success: true }
        }

        set({ isLoading: false })
        return { success: false, error: 'Invalid username or password. Use "research-unit PMNH" / "PMNH@Research2024!" or "demo" for demo mode.' }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false })
      },

      updateProfile: (updates) => {
        const current = get().user
        if (current) {
          set({ user: { ...current, ...updates } })
        }
      },
    }),
    {
      name: 'pmnh-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
