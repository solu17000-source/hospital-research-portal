'use client'

/**
 * Data source — every collection is fetched from Supabase, full stop.
 *
 * There is no demo-mode branch, no DEMO_* fallback, no localStorage shim.
 * If Supabase returns an error or an empty rowset, the caller gets `[]`
 * (or zeroed stats / `null`) and the UI shows its empty state. This
 * eliminates the class of bugs where the page silently rendered 8 ghost
 * rows from `DEMO_RESEARCH` while the live database had 16.
 *
 * Two APIs per collection:
 *
 *   • `fetch*`  — plain async function, usable from server actions / RSC.
 *   • `use*`    — thin React hook returning `{data, loading, error, refetch}`.
 *                Subscribes to the global refresh signal so the UI updates
 *                instantly after any successful mutation, no manual reload.
 */

import { useCallback, useEffect, useState } from 'react'

import { createClient } from './supabase'
import type {
  AIInsight, ActivityLog, DashboardStats, Department, Notification, Profile,
  ResearchProject,
} from '@/types'

// ============================================================
// Refresh signal — pinged by every successful mutation so every
// active `useDataSource` hook refetches and the UI updates instantly
// without manual reload.
// ============================================================
const refreshSubscribers = new Set<() => void>()
export function subscribeRefresh(cb: () => void): () => void {
  refreshSubscribers.add(cb)
  return () => { refreshSubscribers.delete(cb) }
}
function notifyRefresh(): void {
  refreshSubscribers.forEach(cb => {
    try { cb() } catch { /* ignore */ }
  })
}

// ============================================================
// Race utility — bounds every Supabase call so a hung fetch can't
// leave the UI's "Saving…" state stuck forever.
// ============================================================
function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    Promise.resolve(p).then(
      v => { clearTimeout(timer); resolve(v) },
      e => { clearTimeout(timer); reject(e) },
    )
  })
}

// ============================================================
// Auth hydration — forces the supabase-js auth state into memory
// from cookies BEFORE we make a write. Skipping this was the root
// cause of `auth.uid()` coming back null inside RLS policies.
// ============================================================
async function ensureAuthenticated(
  supabase: ReturnType<typeof createClient>,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('[ensureAuthenticated] getSession error:', error)
      return { ok: false, error: error.message }
    }
    if (!session?.user) {
      const { data: refreshed } = await supabase.auth.refreshSession()
      if (!refreshed?.session?.user) {
        return { ok: false, error: 'الجلسة منتهية — يرجى تسجيل الدخول من جديد.' }
      }
      return { ok: true, userId: refreshed.session.user.id }
    }
    return { ok: true, userId: session.user.id }
  } catch (e) {
    console.error('[ensureAuthenticated] threw:', e)
    return { ok: false, error: (e as Error).message }
  }
}

// ============================================================
// Empty fallbacks — used when Supabase returns nothing OR errors.
// Never demo data. The UI surfaces a real empty state instead.
// ============================================================
const EMPTY_STATS: DashboardStats = {
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

// ============================================================
// Fetch primitives — async, always return *something* sane.
// ============================================================

/**
 * Departments fetcher — simplest possible direct query.
 *
 * Per operator spec:
 *   - No timeout wrapper.
 *   - Direct query against the shared client — no special client, no
 *     extra headers, no abstractions.
 *   - Ordered by name so the dropdown reads alphabetically.
 *   - Errors are logged and the function returns []; the page's
 *     existing empty-state callout will tell the operator to check
 *     the console.
 *
 * The departments table has RLS policy `USING true` so this read works
 * for both authenticated and anonymous sessions — no auth bootstrap
 * wait is required.
 */
export async function fetchDepartments(): Promise<Department[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) {
    console.error('[fetchDepartments] Supabase error:', error)
    return []
  }
  console.info(`[fetchDepartments] returned ${(data ?? []).length} rows`)
  return (data as Department[] | null) ?? []
}

export type ResearchQuery = {
  departmentId?: string
  status?: ResearchProject['status']
  publicOnly?: boolean
  limit?: number
}

export async function fetchResearch(opts: ResearchQuery = {}): Promise<ResearchProject[]> {
  const supabase = createClient()
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
    const { data, error } = await withTimeout(q, 10_000, 'fetchResearch')
    if (error) {
      console.error('[fetchResearch] Supabase error:', error)
      return []
    }
    return (data as ResearchProject[] | null) ?? []
  } catch (e) {
    console.error('[fetchResearch] threw:', e)
    return []
  }
}

export async function fetchResearchById(id: string): Promise<ResearchProject | null> {
  const supabase = createClient()
  try {
    const { data, error } = await withTimeout(
      supabase.from('research_projects').select('*').eq('id', id).maybeSingle(),
      10_000,
      'fetchResearchById',
    )
    if (error) {
      console.error('[fetchResearchById] Supabase error:', error)
      return null
    }
    return (data as ResearchProject | null) ?? null
  } catch (e) {
    console.error('[fetchResearchById] threw:', e)
    return null
  }
}

export async function fetchUsers(): Promise<Profile[]> {
  const supabase = createClient()
  try {
    const { data, error } = await withTimeout(
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      10_000,
      'fetchUsers',
    )
    if (error) {
      console.error('[fetchUsers] Supabase error:', error)
      return []
    }
    return (data as Profile[] | null) ?? []
  } catch (e) {
    console.error('[fetchUsers] threw:', e)
    return []
  }
}

export async function fetchNotifications(userId?: string, limit = 20): Promise<Notification[]> {
  const supabase = createClient()
  try {
    let q = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (userId) q = q.eq('user_id', userId)
    const { data, error } = await withTimeout(q, 10_000, 'fetchNotifications')
    if (error) {
      console.error('[fetchNotifications] Supabase error:', error)
      return []
    }
    return (data as Notification[] | null) ?? []
  } catch (e) {
    console.error('[fetchNotifications] threw:', e)
    return []
  }
}

export async function fetchActivityLogs(limit = 50): Promise<ActivityLog[]> {
  const supabase = createClient()
  try {
    const { data, error } = await withTimeout(
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(limit),
      10_000,
      'fetchActivityLogs',
    )
    if (error) {
      console.error('[fetchActivityLogs] Supabase error:', error)
      return []
    }
    return (data as ActivityLog[] | null) ?? []
  } catch (e) {
    console.error('[fetchActivityLogs] threw:', e)
    return []
  }
}

export async function fetchAiInsights(): Promise<AIInsight[]> {
  // AI insights are computed, not stored. Returning [] until a real
  // analytics service is wired — the page will render its empty state.
  return []
}

/**
 * Aggregate dashboard stats via head-only count queries (cheap).
 * Every count returns 0 on error and the UI surfaces zeros instead of
 * silently leaking fabricated demo numbers.
 */
export async function fetchStats(): Promise<DashboardStats> {
  const supabase = createClient()
  try {
    const [
      total, active, completed, delayed, published, pendingIrb, q1, q2, q3, q4, openAccess,
      totalDepartments, totalUsers, fundedProjects,
    ] = await withTimeout(
      Promise.all([
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
      ]),
      15_000,
      'fetchStats',
    )
    return {
      ...EMPTY_STATS,
      total_projects: total ?? 0,
      active_projects: active ?? 0,
      completed_projects: completed ?? 0,
      delayed_projects: delayed ?? 0,
      published_papers: published ?? 0,
      pending_irb: pendingIrb ?? 0,
      q1_publications: q1 ?? 0,
      q2_publications: q2 ?? 0,
      q3_publications: q3 ?? 0,
      q4_publications: q4 ?? 0,
      open_access_count: openAccess ?? 0,
      total_departments: totalDepartments ?? 0,
      total_users: totalUsers ?? 0,
      funded_projects: fundedProjects ?? 0,
    }
  } catch (e) {
    console.error('[fetchStats] threw:', e)
    return EMPTY_STATS
  }
}

/** Tiny helper — head-only count with an arbitrary equality filter set. */
async function countWhere(
  client: ReturnType<typeof createClient>,
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

/** Postgres `uuid` columns reject anything that isn't a 128-bit hex
 *  formatted as 8-4-4-4-12. Coerce anything else to null. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function uuidOrNull(v?: string | null): string | null {
  if (!v) return null
  return UUID_RE.test(v.trim()) ? v.trim() : null
}

function toServerPayload(input: ResearchInput) {
  return {
    title: input.title.trim(),
    title_ar: input.title_ar || null,
    abstract: input.abstract || null,
    keywords: input.keywords ?? null,
    research_category: input.research_category || null,
    department_id: uuidOrNull(input.department_id),
    principal_investigator_id: uuidOrNull(input.principal_investigator_id),
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
    created_by: uuidOrNull(input.created_by),
  }
}

export async function createResearch(input: ResearchInput): Promise<CreateResult<ResearchProject>> {
  if (!input.title || !input.title.trim()) {
    return { ok: false, error: 'العنوان مطلوب.' }
  }
  const supabase = createClient()
  try {
    const auth = await ensureAuthenticated(supabase)
    if (!auth.ok) return { ok: false, error: auth.error }
    const payload = { ...toServerPayload(input), created_by: auth.userId }
    const { data, error } = await withTimeout(
      supabase
        .from('research_projects')
        .insert(payload)
        .select('*')
        .single(),
      15_000,
      'createResearch',
    )
    if (error) {
      console.error('[createResearch] Supabase error:', error)
      return { ok: false, error: error.message || 'فشل الحفظ.' }
    }
    notifyRefresh()
    return { ok: true, row: data as ResearchProject }
  } catch (e) {
    console.error('[createResearch] threw:', e)
    return { ok: false, error: (e as Error).message || 'خطأ في الشبكة.' }
  }
}

export async function updateResearch(
  id: string,
  patch: Partial<ResearchInput>,
): Promise<CreateResult<ResearchProject>> {
  const supabase = createClient()
  try {
    const auth = await ensureAuthenticated(supabase)
    if (!auth.ok) return { ok: false, error: auth.error }

    const fullInput: ResearchInput = { title: '', ...patch }
    const fullPayload = toServerPayload(fullInput)
    const payload: Record<string, unknown> = {}
    for (const k of Object.keys(patch)) {
      if (k in fullPayload) payload[k] = (fullPayload as Record<string, unknown>)[k]
    }
    payload.updated_at = new Date().toISOString()
    payload.updated_by = auth.userId

    const { data, error } = await withTimeout(
      supabase
        .from('research_projects')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single(),
      15_000,
      'updateResearch',
    )
    if (error) {
      console.error('[updateResearch] Supabase error:', error)
      return { ok: false, error: error.message || 'فشل التحديث.' }
    }
    notifyRefresh()
    return { ok: true, row: data as ResearchProject }
  } catch (e) {
    console.error('[updateResearch] threw:', e)
    return { ok: false, error: (e as Error).message || 'خطأ في الشبكة.' }
  }
}

export async function deleteResearch(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient()
  try {
    const auth = await ensureAuthenticated(supabase)
    if (!auth.ok) return { ok: false, error: auth.error }
    const { error } = await withTimeout(
      supabase.from('research_projects').delete().eq('id', id),
      15_000,
      'deleteResearch',
    )
    if (error) {
      console.error('[deleteResearch] Supabase error:', error)
      return { ok: false, error: error.message || 'فشل الحذف.' }
    }
    notifyRefresh()
    return { ok: true }
  } catch (e) {
    console.error('[deleteResearch] threw:', e)
    return { ok: false, error: (e as Error).message || 'خطأ في الشبكة.' }
  }
}

export async function createResearchBulk(inputs: ResearchInput[]): Promise<BulkResult> {
  const result: BulkResult = { ok: 0, failed: 0, rows: [], errors: [] }
  const supabase = createClient()
  try {
    const valid: ResearchInput[] = []
    inputs.forEach((input, i) => {
      if (input.title?.trim()) valid.push(input)
      else {
        result.failed++
        result.errors.push({ row: i + 2, error: 'عنوان مفقود', title: input.title })
      }
    })
    if (valid.length === 0) return result

    const auth = await ensureAuthenticated(supabase)
    if (!auth.ok) {
      result.failed += valid.length
      result.errors.push({ row: 0, error: auth.error })
      return result
    }

    const { data, error } = await withTimeout(
      supabase
        .from('research_projects')
        .insert(valid.map(v => ({ ...toServerPayload(v), created_by: auth.userId })))
        .select('*'),
      30_000,
      'createResearchBulk',
    )
    if (error) {
      console.error('[createResearchBulk] Supabase error:', error)
      result.failed += valid.length
      result.errors.push({ row: 0, error: error.message })
      return result
    }
    result.ok = (data?.length ?? 0)
    result.rows = (data ?? []) as ResearchProject[]
    notifyRefresh()
    return result
  } catch (e) {
    console.error('[createResearchBulk] threw:', e)
    result.failed = inputs.length
    result.errors.push({ row: 0, error: (e as Error).message || 'خطأ في الشبكة.' })
    return result
  }
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
 *     ['active'],
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

  // Refresh on any global mutation signal.
  useEffect(() => subscribeRefresh(() => { void load() }), [load])

  return { data, loading, error, refetch: load }
}

/** ---------- Specialized hooks ---------- */
/**
 * Departments hook — calls fetchDepartments() immediately on mount.
 *
 * Per operator spec: no auth-bootstrap gate (the table is public —
 * `departments_public_read USING true`), no special handling. The
 * standard useDataSource hook fires the fetcher in its mount effect,
 * `loading` flips to false in its `finally` block whether the fetch
 * succeeded or returned [], and subscribeRefresh re-fires it on any
 * downstream mutation. The /research/new dropdown then auto-populates
 * without the operator touching the Refresh button.
 */
export function useDepartments() {
  return useDataSource<Department[]>(fetchDepartments)
}
export function useResearch(opts: ResearchQuery = {}) {
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
