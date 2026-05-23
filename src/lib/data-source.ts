'use client'

/**
 * Data source abstraction — one entry point per collection that returns
 * Supabase rows when the project is configured, and demo data otherwise.
 *
 * Two APIs are exposed for each collection:
 *
 *   • a plain async `fetch*` function — for server actions, server
 *     components, and code outside React.
 *   • a thin `use*` hook — for dashboard pages. The hook returns the
 *     full state machine `{ data, loading, error, refetch }` so callers
 *     don't have to wire `useEffect` themselves. While loading it returns
 *     the demo fallback synchronously, which keeps the existing pages
 *     working unchanged when wired through `data ?? DEMO_*`.
 *
 * Migration pattern for an existing page that imports DEMO_* directly:
 *
 *     // before
 *     import { DEMO_STATS } from '@/lib/demo-data'
 *     const stats = DEMO_STATS
 *
 *     // after
 *     import { useStats } from '@/lib/data-source'
 *     import { DEMO_STATS } from '@/lib/demo-data'
 *     const { data } = useStats()
 *     const stats = data ?? DEMO_STATS
 *
 * That's a 2-line diff per page — the rest of the page stays synchronous
 * and renders demo data briefly while the live query resolves.
 */

import { useCallback, useEffect, useState } from 'react'

import {
  DEMO_ACTIVITY_LOGS, DEMO_AI_INSIGHTS, DEMO_DEPARTMENTS, DEMO_NOTIFICATIONS,
  DEMO_RESEARCH, DEMO_STATS, DEMO_USERS,
} from './demo-data'
import { createClient, isDemoMode } from './supabase'
import type {
  AIInsight, ActivityLog, DashboardStats, Department, Notification, Profile,
  ResearchProject,
} from '@/types'

// ============================================================
// Fetch primitives — async, isomorphic, always return *something*.
// Every loader falls back to demo data when Supabase isn't configured
// or returns an error so the dashboard never shows a blank screen.
// ============================================================

export async function fetchDepartments(): Promise<Department[]> {
  if (isDemoMode) return DEMO_DEPARTMENTS
  const supabase = createClient()
  if (!supabase) return DEMO_DEPARTMENTS
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('research_count', { ascending: false })
    if (error || !data) return DEMO_DEPARTMENTS
    return data as Department[]
  } catch { return DEMO_DEPARTMENTS }
}

export type ResearchQuery = {
  departmentId?: string
  status?: ResearchProject['status']
  publicOnly?: boolean
  limit?: number
}
export async function fetchResearch(opts: ResearchQuery = {}): Promise<ResearchProject[]> {
  if (isDemoMode) return applyResearchFilters(DEMO_RESEARCH, opts)
  const supabase = createClient()
  if (!supabase) return applyResearchFilters(DEMO_RESEARCH, opts)
  try {
    let q = supabase
      .from('research_projects')
      .select('*')
      .eq('is_archived', false)
      .order('updated_at', { ascending: false })
    if (opts.departmentId) q = q.eq('department_id', opts.departmentId)
    if (opts.status)       q = q.eq('status', opts.status)
    if (opts.publicOnly)   q = q.eq('is_public', true)
    if (opts.limit)        q = q.limit(opts.limit)
    const { data, error } = await q
    if (error || !data) return applyResearchFilters(DEMO_RESEARCH, opts)
    return data as ResearchProject[]
  } catch { return applyResearchFilters(DEMO_RESEARCH, opts) }
}
function applyResearchFilters(list: ResearchProject[], opts: ResearchQuery): ResearchProject[] {
  let out = list.slice()
  if (opts.departmentId) out = out.filter(r => r.department_id === opts.departmentId)
  if (opts.status)       out = out.filter(r => r.status === opts.status)
  if (opts.publicOnly)   out = out.filter(r => r.is_public || r.publication_status === 'published')
  if (opts.limit)        out = out.slice(0, opts.limit)
  return out
}

export async function fetchResearchById(id: string): Promise<ResearchProject | null> {
  if (isDemoMode) return DEMO_RESEARCH.find(r => r.id === id) ?? null
  const supabase = createClient()
  if (!supabase) return DEMO_RESEARCH.find(r => r.id === id) ?? null
  try {
    const { data } = await supabase.from('research_projects').select('*').eq('id', id).maybeSingle()
    return (data as ResearchProject | null) ?? null
  } catch { return null }
}

export async function fetchUsers(): Promise<Profile[]> {
  if (isDemoMode) return DEMO_USERS
  const supabase = createClient()
  if (!supabase) return DEMO_USERS
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error || !data) return DEMO_USERS
    return data as Profile[]
  } catch { return DEMO_USERS }
}

export async function fetchNotifications(userId?: string, limit = 20): Promise<Notification[]> {
  if (isDemoMode) return DEMO_NOTIFICATIONS.slice(0, limit)
  const supabase = createClient()
  if (!supabase) return DEMO_NOTIFICATIONS.slice(0, limit)
  try {
    let q = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit)
    if (userId) q = q.eq('user_id', userId)
    const { data, error } = await q
    if (error || !data) return DEMO_NOTIFICATIONS.slice(0, limit)
    return data as Notification[]
  } catch { return DEMO_NOTIFICATIONS.slice(0, limit) }
}

export async function fetchActivityLogs(limit = 50): Promise<ActivityLog[]> {
  if (isDemoMode) return DEMO_ACTIVITY_LOGS.slice(0, limit)
  const supabase = createClient()
  if (!supabase) return DEMO_ACTIVITY_LOGS.slice(0, limit)
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error || !data) return DEMO_ACTIVITY_LOGS.slice(0, limit)
    return data as ActivityLog[]
  } catch { return DEMO_ACTIVITY_LOGS.slice(0, limit) }
}

export async function fetchAiInsights(): Promise<AIInsight[]> {
  // AI insights are computed rather than stored — for now we ship the demo
  // set in both modes. When the AI service is wired this will become a real
  // server call.
  return DEMO_AI_INSIGHTS
}

/**
 * Aggregate dashboard stats. Uses head-only count queries against Supabase
 * (cheap), filling in any field the database doesn't yet have with the
 * demo equivalent so the dashboard renders fully populated.
 */
export async function fetchStats(): Promise<DashboardStats> {
  if (isDemoMode) return DEMO_STATS
  const supabase = createClient()
  if (!supabase) return DEMO_STATS
  try {
    const [
      total, active, completed, delayed, published, pendingIrb, q1, q2, q3, q4, openAccess,
      totalDepartments, totalUsers, fundedProjects,
    ] = await Promise.all([
      countWhere(supabase, 'research_projects'),
      countWhere(supabase, 'research_projects', { status: 'active' }),
      countWhere(supabase, 'research_projects', { status: 'completed' }),
      countWhere(supabase, 'research_projects', { status: 'delayed' }),
      countWhere(supabase, 'research_projects', { publication_status: 'published' }),
      countWhere(supabase, 'research_projects', { irb_approval_status: 'pending' }),
      countWhere(supabase, 'research_projects', { journal_quartile: 'Q1' }),
      countWhere(supabase, 'research_projects', { journal_quartile: 'Q2' }),
      countWhere(supabase, 'research_projects', { journal_quartile: 'Q3' }),
      countWhere(supabase, 'research_projects', { journal_quartile: 'Q4' }),
      countWhere(supabase, 'research_projects', { is_open_access: true }),
      countWhere(supabase, 'departments', { is_active: true }),
      countWhere(supabase, 'profiles', { is_active: true }),
      countWhere(supabase, 'research_projects', { funding_source: { _not_null: true } }),
    ])
    return {
      ...DEMO_STATS,
      total_projects: total ?? DEMO_STATS.total_projects,
      active_projects: active ?? DEMO_STATS.active_projects,
      completed_projects: completed ?? DEMO_STATS.completed_projects,
      delayed_projects: delayed ?? DEMO_STATS.delayed_projects,
      published_papers: published ?? DEMO_STATS.published_papers,
      pending_irb: pendingIrb ?? DEMO_STATS.pending_irb,
      q1_publications: q1 ?? DEMO_STATS.q1_publications,
      q2_publications: q2 ?? DEMO_STATS.q2_publications,
      q3_publications: q3 ?? DEMO_STATS.q3_publications,
      q4_publications: q4 ?? DEMO_STATS.q4_publications,
      open_access_count: openAccess ?? DEMO_STATS.open_access_count,
      total_departments: totalDepartments ?? DEMO_STATS.total_departments,
      total_users: totalUsers ?? DEMO_STATS.total_users,
      funded_projects: fundedProjects ?? DEMO_STATS.funded_projects,
    }
  } catch { return DEMO_STATS }
}

/** Tiny helper — head-only count with an arbitrary equality filter set. */
async function countWhere(
  client: NonNullable<ReturnType<typeof createClient>>,
  table: string,
  where?: Record<string, unknown>,
): Promise<number | null> {
  let q = client.from(table).select('id', { count: 'exact', head: true })
  if (where) {
    for (const [k, v] of Object.entries(where)) {
      if (v && typeof v === 'object' && '_not_null' in (v as Record<string, unknown>)) {
        q = q.not(k, 'is', null)
      } else {
        q = q.eq(k, v as string | number | boolean)
      }
    }
  }
  const { count } = await q
  return count ?? null
}

// ============================================================
// React hooks
// ============================================================

export type DataResult<T> = {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Generic React state machine around an async loader. Used by every
 * `use*` hook below; can also be used directly with a custom loader.
 *
 *   const { data, loading, error, refetch } = useDataSource(
 *     () => fetchResearch({ status: 'active' }),
 *     ['active'],  // dependency tuple — refetches when these change
 *   )
 */
export function useDataSource<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
): DataResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await loader()
      setData(result)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => { void load() }, [load])

  return { data, loading, error, refetch: load }
}

/** ---------- Specialized hooks ---------- */
export function useDepartments() {
  return useDataSource<Department[]>(fetchDepartments)
}
export function useResearch(opts: ResearchQuery = {}) {
  // Stable dependency tuple — JSON-stringifying keeps the hook happy with
  // object-typed options without forcing callers to memoize at the call site.
  const depKey = JSON.stringify(opts)
  return useDataSource<ResearchProject[]>(() => fetchResearch(opts), [depKey])
}
export function useResearchById(id: string) {
  return useDataSource<ResearchProject | null>(() => fetchResearchById(id), [id])
}
export function useUsers() {
  return useDataSource<Profile[]>(fetchUsers)
}
export function useNotifications(userId?: string, limit = 20) {
  return useDataSource<Notification[]>(() => fetchNotifications(userId, limit), [userId, limit])
}
export function useActivityLogs(limit = 50) {
  return useDataSource<ActivityLog[]>(() => fetchActivityLogs(limit), [limit])
}
export function useAiInsights() {
  return useDataSource<AIInsight[]>(fetchAiInsights)
}
export function useStats() {
  return useDataSource<DashboardStats>(fetchStats)
}
