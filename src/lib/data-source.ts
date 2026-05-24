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
// Local persistence (demo mode only)
//
// User-created research rows are kept in localStorage so they survive
// reloads and immediately appear in the dashboard, /research list and
// stats. When Supabase is wired, this layer falls silent — rows live
// in the `research_projects` table and RLS gates access.
// ============================================================

const LOCAL_RESEARCH_KEY = 'pmnh-research-local-v1'

function loadLocalResearch(): ResearchProject[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_RESEARCH_KEY)
    return raw ? (JSON.parse(raw) as ResearchProject[]) : []
  } catch { return [] }
}
function saveLocalResearch(list: ResearchProject[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(LOCAL_RESEARCH_KEY, JSON.stringify(list)) } catch {/* quota */}
}

/** Sequence number for demo-mode research IDs — kept separately so we don't
 *  collide with the seeded PMNH-2024-0001..N range. */
function nextDemoResearchId(): string {
  const year = new Date().getFullYear()
  const existing = loadLocalResearch()
  const usedNums = new Set(
    [...DEMO_RESEARCH, ...existing]
      .map(r => r.research_id.match(/PMNH-\d{4}-(\d+)/)?.[1])
      .filter(Boolean)
      .map(s => parseInt(s as string, 10)),
  )
  let n = 5000 // start above the seed range
  while (usedNums.has(n)) n++
  return `PMNH-${year}-${String(n).padStart(4, '0')}`
}

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
/** In demo mode the local-storage rows are merged in *first* so the most
 *  recently created project sorts to the top of the dashboard / list. */
function demoResearchMerged(): ResearchProject[] {
  return [...loadLocalResearch(), ...DEMO_RESEARCH]
}
export async function fetchResearch(opts: ResearchQuery = {}): Promise<ResearchProject[]> {
  if (isDemoMode) return applyResearchFilters(demoResearchMerged(), opts)
  const supabase = createClient()
  if (!supabase) return applyResearchFilters(demoResearchMerged(), opts)
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
    if (error || !data) return applyResearchFilters(demoResearchMerged(), opts)
    return data as ResearchProject[]
  } catch { return applyResearchFilters(demoResearchMerged(), opts) }
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
  if (isDemoMode) {
    // Recompute counts from the merged list so user-created rows show up
    // in the dashboard KPI strip immediately after creation.
    const all = demoResearchMerged()
    const by = (pred: (r: ResearchProject) => boolean) => all.filter(pred).length
    const localCount = loadLocalResearch().length
    return {
      ...DEMO_STATS,
      total_projects:      all.length,
      active_projects:     by(r => r.status === 'active'),
      completed_projects:  by(r => r.status === 'completed'),
      delayed_projects:    by(r => r.status === 'delayed'),
      published_papers:    by(r => r.publication_status === 'published'),
      pending_irb:         by(r => r.irb_approval_status === 'pending'),
      q1_publications:     by(r => r.journal_quartile === 'Q1'),
      q2_publications:     by(r => r.journal_quartile === 'Q2'),
      q3_publications:     by(r => r.journal_quartile === 'Q3'),
      q4_publications:     by(r => r.journal_quartile === 'Q4'),
      open_access_count:   by(r => !!r.is_open_access),
      this_month_new:      DEMO_STATS.this_month_new + localCount,
      funded_projects:     by(r => !!r.funding_source),
    }
  }
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
// Writes (research)
// ============================================================

/** What callers hand us — the schema fields they're allowed to set.
 *  `research_id`, timestamps, `is_archived` and audit fields are derived. */
export type ResearchInput = Partial<Omit<ResearchProject,
  'id' | 'research_id' | 'created_at' | 'updated_at' | 'is_archived' | 'citation_count'
>> & { title: string }

export type CreateResult<T> = { ok: true; row: T } | { ok: false; error: string }
export type BulkResult = {
  ok: number
  failed: number
  rows: ResearchProject[]
  errors: { row: number; error: string; title?: string }[]
}

/** Hydrate a `ResearchInput` into a fully-populated `ResearchProject` row,
 *  filling enum defaults that the database has but the client may have
 *  omitted. Used by both the single create + the bulk path. */
function buildResearchRow(input: ResearchInput): ResearchProject {
  const now = new Date().toISOString()
  return {
    id: `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    research_id: nextDemoResearchId(),
    title: input.title.trim(),
    title_ar: input.title_ar,
    abstract: input.abstract,
    keywords: input.keywords,
    research_category: input.research_category,
    department_id: input.department_id,
    principal_investigator_id: input.principal_investigator_id,
    principal_investigator_name: input.principal_investigator_name,
    start_date: input.start_date,
    expected_completion_date: input.expected_completion_date,
    actual_completion_date: input.actual_completion_date,
    status: input.status ?? 'active',
    workflow_stage: input.workflow_stage ?? 'idea_submitted',
    priority_level: input.priority_level ?? 'medium',
    completion_percentage: input.completion_percentage ?? 0,
    irb_approval_status: input.irb_approval_status ?? 'pending',
    irb_approval_date: input.irb_approval_date,
    irb_approval_number: input.irb_approval_number,
    department_approval_status: input.department_approval_status ?? 'pending',
    department_approval_date: input.department_approval_date,
    ethics_approval_status: input.ethics_approval_status ?? 'pending',
    ethics_approval_date: input.ethics_approval_date,
    funding_source: input.funding_source,
    budget: input.budget,
    budget_currency: input.budget_currency ?? 'SAR',
    publication_status: input.publication_status ?? 'not_submitted',
    journal_name: input.journal_name,
    journal_submission_date: input.journal_submission_date,
    journal_acceptance_date: input.journal_acceptance_date,
    publication_date: input.publication_date,
    doi: input.doi,
    publication_link: input.publication_link,
    impact_factor: input.impact_factor,
    citation_count: 0,
    journal_quartile: input.journal_quartile ?? 'not_indexed',
    indexed_database: input.indexed_database ?? 'not_indexed',
    is_open_access: input.is_open_access ?? false,
    publication_type: input.publication_type,
    notes: input.notes,
    is_public: input.is_public ?? false,
    is_archived: false,
    created_by: input.created_by,
    updated_by: input.updated_by,
    created_at: now,
    updated_at: now,
  }
}

/** Server input shape — strips client-only synthetic fields when we hand
 *  the payload to Supabase. The DB trigger fills `research_id` itself. */
function toServerPayload(input: ResearchInput) {
  return {
    title: input.title.trim(),
    title_ar: input.title_ar || null,
    abstract: input.abstract || null,
    keywords: input.keywords ?? null,
    research_category: input.research_category || null,
    department_id: input.department_id || null,
    principal_investigator_id: input.principal_investigator_id || null,
    principal_investigator_name: input.principal_investigator_name || null,
    start_date: input.start_date || null,
    expected_completion_date: input.expected_completion_date || null,
    status: input.status ?? 'active',
    workflow_stage: input.workflow_stage ?? 'idea_submitted',
    priority_level: input.priority_level ?? 'medium',
    completion_percentage: input.completion_percentage ?? 0,
    irb_approval_status: input.irb_approval_status ?? 'pending',
    irb_approval_number: input.irb_approval_number || null,
    department_approval_status: input.department_approval_status ?? 'pending',
    ethics_approval_status: input.ethics_approval_status ?? 'pending',
    funding_source: input.funding_source || null,
    budget: input.budget ?? null,
    budget_currency: input.budget_currency ?? 'SAR',
    publication_status: input.publication_status ?? 'not_submitted',
    journal_name: input.journal_name || null,
    publication_date: input.publication_date || null,
    doi: input.doi || null,
    journal_quartile: input.journal_quartile ?? 'not_indexed',
    indexed_database: input.indexed_database ?? 'not_indexed',
    is_open_access: input.is_open_access ?? false,
    notes: input.notes || null,
    is_public: input.is_public ?? false,
    created_by: input.created_by || null,
  }
}

export async function createResearch(input: ResearchInput): Promise<CreateResult<ResearchProject>> {
  if (!input.title || !input.title.trim()) {
    return { ok: false, error: 'Title is required.' }
  }

  // -------- Supabase path --------
  if (!isDemoMode) {
    const supabase = createClient()
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('research_projects')
          .insert(toServerPayload(input))
          .select('*')
          .single()
        if (error || !data) return { ok: false, error: error?.message || 'Insert failed' }
        return { ok: true, row: data as ResearchProject }
      } catch (e) {
        return { ok: false, error: (e as Error).message || 'Network error' }
      }
    }
  }

  // -------- Demo / localStorage path --------
  const row = buildResearchRow(input)
  const existing = loadLocalResearch()
  saveLocalResearch([row, ...existing])
  return { ok: true, row }
}

export async function createResearchBulk(inputs: ResearchInput[]): Promise<BulkResult> {
  const result: BulkResult = { ok: 0, failed: 0, rows: [], errors: [] }

  // -------- Supabase path: one batched insert --------
  if (!isDemoMode) {
    const supabase = createClient()
    if (supabase) {
      try {
        const valid = inputs.filter(i => i.title && i.title.trim())
        const skipped = inputs.length - valid.length
        for (let i = 0; i < inputs.length; i++) {
          if (!inputs[i].title?.trim()) {
            result.failed++
            result.errors.push({ row: i + 2, error: 'Missing title', title: inputs[i].title })
          }
        }
        if (valid.length === 0) return result
        const { data, error } = await supabase
          .from('research_projects')
          .insert(valid.map(toServerPayload))
          .select('*')
        if (error) {
          result.failed += valid.length
          result.errors.push({ row: 0, error: error.message })
          return result
        }
        result.ok = (data?.length ?? 0)
        result.rows = (data ?? []) as ResearchProject[]
        result.failed += skipped
        return result
      } catch (e) {
        result.failed = inputs.length
        result.errors.push({ row: 0, error: (e as Error).message || 'Network error' })
        return result
      }
    }
  }

  // -------- Demo path: append each in turn --------
  const builtRows: ResearchProject[] = []
  inputs.forEach((input, idx) => {
    if (!input.title?.trim()) {
      result.failed++
      result.errors.push({ row: idx + 2, error: 'Missing title', title: input.title })
      return
    }
    builtRows.push(buildResearchRow(input))
    result.ok++
  })
  if (builtRows.length) {
    const existing = loadLocalResearch()
    saveLocalResearch([...builtRows, ...existing])
    result.rows = builtRows
  }
  return result
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
