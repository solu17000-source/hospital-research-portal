'use client'

/**
 * Data source — every read AND every write goes through raw `fetch()`
 * straight to PostgREST, NOT through supabase-js.
 *
 * Why: the supabase-js singleton client was observed to hang
 * indefinitely on this deployment for both reads and writes (the same
 * raw fetch with the same URL + apikey + JWT works in <1s). Bypassing
 * the library entirely sidesteps every internal-state edge case in
 * one move.
 *
 * The JWT comes from the Zustand `useAuthStore` — login stamps it at
 * sign-in time, persist restores it across reloads. No `getSession()`
 * call anywhere in this module.
 */

import { useCallback, useEffect, useState } from 'react'

import { useAuthStore } from './auth-store'
import type {
  AIInsight, ActivityLog, DashboardStats, Department, Notification, Profile,
  ResearchProject,
} from '@/types'

// ============================================================
// PostgREST plumbing — raw fetch with the user's JWT
// ============================================================

const PMNH_SUPABASE_URL  = 'https://owcgtvobxpystflqmyij.supabase.co'
const PMNH_SUPABASE_ANON = 'sb_publishable_bA9xnDC9Rjin5OzjGAT4kQ_sh4_4Hcx'

/** Pull the bearer token Zustand persisted at login. Falls back to the
 *  anon key so anonymous reads (departments etc.) still work pre-login. */
function bearerToken(): string {
  const fromStore = useAuthStore.getState().accessToken
  if (fromStore) return fromStore
  // Defensive: try the supabase-js localStorage key in case the Zustand
  // persist hasn't rehydrated yet on first paint.
  if (typeof window !== 'undefined') {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-pmnh-auth')) {
          const raw = localStorage.getItem(key)
          if (raw) {
            const parsed = JSON.parse(raw) as { access_token?: string }
            if (parsed?.access_token) return parsed.access_token
          }
        }
      }
    } catch { /* ignore */ }
  }
  return PMNH_SUPABASE_ANON
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: PMNH_SUPABASE_ANON,
    Authorization: `Bearer ${bearerToken()}`,
    'Cache-Control': 'no-store',
    ...extra,
  }
}

type RestOk<T>   = { ok: true; data: T }
type RestErr     = { ok: false; error: string; status?: number }
type RestResult<T> = RestOk<T> | RestErr

async function pmnhRest<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<RestResult<T>> {
  const timeoutMs = init.timeoutMs ?? 10_000
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${PMNH_SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: authHeaders(init.headers as Record<string, string> | undefined),
      signal: controller.signal,
    })
    clearTimeout(tid)

    const text = await res.text()
    if (!res.ok) {
      console.error(`[pmnhRest] HTTP ${res.status} for ${path}:`, text.slice(0, 300))
      let msg = `HTTP ${res.status}`
      try {
        const parsed = JSON.parse(text) as { message?: string; hint?: string; details?: string }
        msg = parsed.message || parsed.hint || parsed.details || msg
      } catch { msg = text.slice(0, 200) || msg }
      return { ok: false, error: msg, status: res.status }
    }

    if (!text) return { ok: true, data: null as T }
    try {
      return { ok: true, data: JSON.parse(text) as T }
    } catch {
      return { ok: false, error: 'Invalid JSON in response' }
    }
  } catch (e) {
    clearTimeout(tid)
    const err = e as Error
    if (err.name === 'AbortError') {
      console.error(`[pmnhRest] ${path} aborted after ${timeoutMs}ms`)
      return { ok: false, error: `انتهت المهلة (${timeoutMs / 1000} ثوانٍ).` }
    }
    console.error(`[pmnhRest] ${path} threw:`, err)
    return { ok: false, error: err.message || 'خطأ في الشبكة.' }
  }
}

/** HEAD count query — reads the total from PostgREST's Content-Range. */
async function pmnhCount(
  pathAndFilters: string,
  timeoutMs = 10_000,
): Promise<number> {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${PMNH_SUPABASE_URL}/rest/v1/${pathAndFilters}`, {
      method: 'HEAD',
      headers: authHeaders({ Prefer: 'count=exact' }),
      signal: controller.signal,
    })
    clearTimeout(tid)
    if (!res.ok) {
      console.error(`[pmnhCount] HTTP ${res.status} for ${pathAndFilters}`)
      return 0
    }
    const range = res.headers.get('Content-Range')  // e.g. "*/19" or "0-0/19"
    if (!range) return 0
    const slash = range.indexOf('/')
    if (slash < 0) return 0
    const total = parseInt(range.slice(slash + 1), 10)
    return Number.isFinite(total) ? total : 0
  } catch (e) {
    clearTimeout(tid)
    console.error(`[pmnhCount] threw for ${pathAndFilters}:`, e)
    return 0
  }
}

// ============================================================
// Refresh signal — pinged by every successful mutation so every
// active `useDataSource` hook refetches and the UI updates instantly.
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
// Empty fallbacks
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
// Fetchers — all raw fetch, no supabase-js, no getSession
// ============================================================

export async function fetchDepartments(): Promise<Department[]> {
  console.log('[fetchDepartments] raw fetch')
  const r = await pmnhRest<Department[]>(
    'departments?is_active=eq.true&order=name&select=*',
  )
  if (!r.ok) {
    console.error('[fetchDepartments]', r.error)
    return []
  }
  console.info(`[fetchDepartments] returned ${(r.data ?? []).length} rows`)
  return r.data ?? []
}

export type ResearchQuery = {
  departmentId?: string
  status?: ResearchProject['status']
  publicOnly?: boolean
  limit?: number
}

export async function fetchResearch(opts: ResearchQuery = {}): Promise<ResearchProject[]> {
  console.log('[fetchResearch] raw fetch', opts)
  let qs = 'is_archived=eq.false&order=updated_at.desc&select=*'
  if (opts.departmentId) qs += `&department_id=eq.${encodeURIComponent(opts.departmentId)}`
  if (opts.status)       qs += `&status=eq.${encodeURIComponent(opts.status)}`
  if (opts.publicOnly)   qs += '&is_public=eq.true'
  if (opts.limit)        qs += `&limit=${opts.limit}`
  const r = await pmnhRest<ResearchProject[]>(`research_projects?${qs}`)
  if (!r.ok) {
    console.error('[fetchResearch]', r.error)
    return []
  }
  console.info(`[fetchResearch] returned ${(r.data ?? []).length} rows`)
  return r.data ?? []
}

export async function fetchResearchById(id: string): Promise<ResearchProject | null> {
  const r = await pmnhRest<ResearchProject[]>(
    `research_projects?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
  )
  if (!r.ok) {
    console.error('[fetchResearchById]', r.error)
    return null
  }
  return r.data?.[0] ?? null
}

export async function fetchUsers(): Promise<Profile[]> {
  const r = await pmnhRest<Profile[]>('profiles?order=created_at.desc&select=*')
  if (!r.ok) {
    console.error('[fetchUsers]', r.error)
    return []
  }
  return r.data ?? []
}

export async function fetchNotifications(userId?: string, limit = 20): Promise<Notification[]> {
  let qs = `order=created_at.desc&limit=${limit}&select=*`
  if (userId) qs = `user_id=eq.${encodeURIComponent(userId)}&${qs}`
  const r = await pmnhRest<Notification[]>(`notifications?${qs}`)
  if (!r.ok) {
    console.error('[fetchNotifications]', r.error)
    return []
  }
  console.info(`[fetchNotifications] returned ${(r.data ?? []).length} rows`)
  return r.data ?? []
}

export async function fetchActivityLogs(limit = 50): Promise<ActivityLog[]> {
  const r = await pmnhRest<ActivityLog[]>(
    `activity_logs?order=created_at.desc&limit=${limit}&select=*`,
  )
  if (!r.ok) {
    console.error('[fetchActivityLogs]', r.error)
    return []
  }
  return r.data ?? []
}

export async function fetchAiInsights(): Promise<AIInsight[]> {
  // AI insights are computed, not stored.
  return []
}

export async function fetchStats(): Promise<DashboardStats> {
  console.log('[fetchStats] running 14 parallel HEAD counts')
  try {
    const [
      total, active, completed, delayed, published, pendingIrb, q1, q2, q3, q4, openAccess,
      totalDepts, totalUsers, fundedProjects,
    ] = await Promise.all([
      pmnhCount('research_projects?is_archived=eq.false'),
      pmnhCount('research_projects?status=eq.active'),
      pmnhCount('research_projects?status=eq.completed'),
      pmnhCount('research_projects?status=eq.delayed'),
      pmnhCount('research_projects?publication_status=eq.published'),
      pmnhCount('research_projects?irb_approval_status=eq.pending'),
      pmnhCount('research_projects?journal_quartile=eq.Q1'),
      pmnhCount('research_projects?journal_quartile=eq.Q2'),
      pmnhCount('research_projects?journal_quartile=eq.Q3'),
      pmnhCount('research_projects?journal_quartile=eq.Q4'),
      pmnhCount('research_projects?is_open_access=eq.true'),
      pmnhCount('departments?is_active=eq.true'),
      pmnhCount('profiles?is_active=eq.true'),
      pmnhCount('research_projects?funding_source=not.is.null'),
    ])
    console.info(`[fetchStats] total=${total} active=${active} dept=${totalDepts}`)
    return {
      ...EMPTY_STATS,
      total_projects: total,
      active_projects: active,
      completed_projects: completed,
      delayed_projects: delayed,
      published_papers: published,
      pending_irb: pendingIrb,
      q1_publications: q1,
      q2_publications: q2,
      q3_publications: q3,
      q4_publications: q4,
      open_access_count: openAccess,
      total_departments: totalDepts,
      total_users: totalUsers,
      funded_projects: fundedProjects,
    }
  } catch (e) {
    console.error('[fetchStats] threw:', e)
    return EMPTY_STATS
  }
}

// ============================================================
// Writers — research_projects
// ============================================================

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

export async function createResearch(
  input: ResearchInput,
  userId: string,
): Promise<CreateResult<ResearchProject>> {
  console.log('[createResearch] step 0: entered', {
    title: input.title?.slice(0, 50),
    userId,
  })
  if (!input.title?.trim()) return { ok: false, error: 'العنوان مطلوب.' }
  if (!userId)              return { ok: false, error: 'User id مفقود.' }

  const token = useAuthStore.getState().accessToken
  if (!token) {
    console.error('[createResearch] no accessToken in store — refusing to submit')
    return { ok: false, error: 'انتهت الجلسة. سجّل دخول من جديد.' }
  }

  console.log('[createResearch] step 1: building payload')
  const payload = { ...toServerPayload(input), created_by: userId }

  console.log('[createResearch] step 2: raw POST /rest/v1/research_projects')
  const r = await pmnhRest<ResearchProject[]>(
    'research_projects',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
      timeoutMs: 8_000,
    },
  )
  if (!r.ok) {
    console.error('[createResearch] failed:', r.error)
    return { ok: false, error: r.error }
  }
  const rows = r.data
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('[createResearch] empty payload')
    return { ok: false, error: 'لم تُرجَع بيانات من الخادم.' }
  }
  console.info('[createResearch] step 4: saved:', rows[0].research_id, rows[0].id)
  notifyRefresh()
  return { ok: true, row: rows[0] }
}

export async function updateResearch(
  id: string,
  patch: Partial<ResearchInput>,
  userId: string,
): Promise<CreateResult<ResearchProject>> {
  console.log('[updateResearch] entered', { id, userId })
  if (!userId) return { ok: false, error: 'User id مفقود.' }

  const fullInput: ResearchInput = { title: '', ...patch }
  const fullPayload = toServerPayload(fullInput)
  const update: Record<string, unknown> = {}
  for (const k of Object.keys(patch)) {
    if (k in fullPayload) update[k] = (fullPayload as Record<string, unknown>)[k]
  }
  update.updated_at = new Date().toISOString()
  update.updated_by = userId

  const r = await pmnhRest<ResearchProject[]>(
    `research_projects?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(update),
      timeoutMs: 8_000,
    },
  )
  if (!r.ok) {
    console.error('[updateResearch] failed:', r.error)
    return { ok: false, error: r.error }
  }
  if (!Array.isArray(r.data) || r.data.length === 0) {
    return { ok: false, error: 'لم تُرجَع بيانات.' }
  }
  console.info('[updateResearch] saved:', r.data[0].id)
  notifyRefresh()
  return { ok: true, row: r.data[0] }
}

export async function deleteResearch(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  console.log('[deleteResearch] entered', { id })
  const r = await pmnhRest<unknown>(
    `research_projects?id=eq.${encodeURIComponent(id)}`,
    { method: 'DELETE', timeoutMs: 8_000 },
  )
  if (!r.ok) {
    console.error('[deleteResearch] failed:', r.error)
    return { ok: false, error: r.error }
  }
  console.info('[deleteResearch] deleted', id)
  notifyRefresh()
  return { ok: true }
}

export async function createResearchBulk(
  inputs: ResearchInput[],
  userId: string,
): Promise<BulkResult> {
  console.log('[createResearchBulk] entered, count:', inputs.length, 'userId:', userId)
  const result: BulkResult = { ok: 0, failed: 0, rows: [], errors: [] }

  const valid: ResearchInput[] = []
  inputs.forEach((input, i) => {
    if (input.title?.trim()) valid.push(input)
    else {
      result.failed++
      result.errors.push({ row: i + 2, error: 'عنوان مفقود', title: input.title })
    }
  })
  if (valid.length === 0) return result
  if (!userId) {
    result.failed += valid.length
    result.errors.push({ row: 0, error: 'User id مفقود.' })
    return result
  }

  const r = await pmnhRest<ResearchProject[]>(
    'research_projects',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(
        valid.map(v => ({ ...toServerPayload(v), created_by: userId })),
      ),
      timeoutMs: 30_000,
    },
  )
  if (!r.ok) {
    result.failed += valid.length
    result.errors.push({ row: 0, error: r.error })
    return result
  }
  result.ok = (r.data ?? []).length
  result.rows = r.data ?? []
  notifyRefresh()
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
  useEffect(() => subscribeRefresh(() => { void load() }), [load])

  return { data, loading, error, refetch: load }
}

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
