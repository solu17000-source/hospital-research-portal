// ============================================================
// DEPRECATED — every demo seed has been removed.
//
// The portal is wired to Supabase as the single source of truth. This file
// used to host hand-written demo data (DEMO_DEPARTMENTS, DEMO_RESEARCH,
// DEMO_USERS, …) that quietly leaked into production pages whenever a
// Supabase fetch was slow or errored. Every export is now an empty array
// or zero object so any leftover `?? DEMO_*` fallback resolves to "nothing"
// instead of fabricated ghost data.
//
// New code MUST NOT import from here. Use the typed hooks in
// `@/lib/data-source` instead (useDepartments, useResearch, useUsers, …).
// These imports remain only so the migration can be made in passes without
// breaking the build.
// ============================================================
import type {
  Profile, Department, ResearchProject, Notification,
  ActivityLog, DashboardStats, AIInsight,
} from '@/types'

export const DEMO_DEPARTMENTS: Department[] = []
export const DEMO_USERS: Profile[] = []
export const DEMO_RESEARCH: ResearchProject[] = []
export const DEMO_NOTIFICATIONS: Notification[] = []
export const DEMO_ACTIVITY_LOGS: ActivityLog[] = []
export const DEMO_AI_INSIGHTS: AIInsight[] = []

export const DEMO_STATS: DashboardStats = {
  total_projects: 0,
  active_projects: 0,
  completed_projects: 0,
  published_papers: 0,
  delayed_projects: 0,
  pending_irb: 0,
  upcoming_deadlines: 0,
  total_departments: 0,
  total_users: 0,
  this_month_new: 0,
  funded_projects: 0,
  total_budget: 0,
  q1_publications: 0,
  q2_publications: 0,
  q3_publications: 0,
  q4_publications: 0,
  open_access_count: 0,
}
