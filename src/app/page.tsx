import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import HomePage, {
  type HomeDepartment,
  type HomePublication,
  type HomeStats,
} from '@/components/home/HomePage'
import { createPublicClient } from '@/lib/supabase-public'

export const metadata: Metadata = {
  title: 'Health & Nursing Research Unit · PMNH Jazan',
  description:
    'Public portal of the Health & Nursing Research Unit at Prince Mohammed Bin Nasser Hospital, Jazan — clinical, nursing, and health-systems research advancing patient care across the Jazan region.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Health & Nursing Research Unit · PMNH Jazan',
    description:
      'Evidence-based research from PMNH Jazan — publications, programs, and the public research portal.',
    type: 'website',
  },
}

// We read cookies + (optionally) Supabase, so this page is dynamic per request.
// Revalidate cached anon reads every 5 minutes when Supabase is configured.
export const dynamic = 'force-dynamic'
export const revalidate = 0

type FetchResult = {
  stats: HomeStats
  featured: HomePublication[]
  departments: HomeDepartment[]
  liveData: boolean
}

async function fetchHomeData(): Promise<FetchResult> {
  const supabase = createPublicClient()

  // Empty-state fallback. The portal is wired to Supabase as the single
  // source of truth; if the public client can't be initialised (missing
  // env vars), the landing page renders zeros instead of seed numbers.
  const empty: FetchResult = {
    stats: {
      active_projects: 0,
      published_papers: 0,
      total_departments: 0,
      q1_publications: 0,
      open_access_count: 0,
      total_users: 0,
    },
    featured: [],
    departments: [],
    liveData: false,
  }

  if (!supabase) return empty

  try {
    const [
      { count: activeProjects },
      { count: publishedPapers },
      { count: q1Publications },
      { count: openAccess },
      { count: totalDepartments },
      { count: totalUsers },
      { data: featuredRows },
      { data: deptRows },
    ] = await Promise.all([
      supabase.from('research_projects').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('is_archived', false),
      supabase.from('research_projects').select('id', { count: 'exact', head: true }).eq('publication_status', 'published'),
      supabase.from('research_projects').select('id', { count: 'exact', head: true }).eq('journal_quartile', 'q1'),
      supabase.from('research_projects').select('id', { count: 'exact', head: true }).eq('is_open_access', true),
      supabase.from('departments').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase
        .from('research_projects')
        .select(
          'id, research_id, title, title_ar, journal_name, publication_date, journal_quartile, is_open_access, principal_investigator_name, department_id',
        )
        .eq('is_public', true)
        .eq('publication_status', 'published')
        .order('publication_date', { ascending: false, nullsFirst: false })
        .limit(6),
      supabase
        .from('departments')
        .select('id, name, name_ar, code, color, research_count')
        .eq('is_active', true)
        .order('research_count', { ascending: false })
        .limit(12),
    ])

    return {
      stats: {
        active_projects: activeProjects ?? 0,
        published_papers: publishedPapers ?? 0,
        total_departments: totalDepartments ?? 0,
        q1_publications: q1Publications ?? 0,
        open_access_count: openAccess ?? 0,
        total_users: totalUsers ?? 0,
      },
      featured: (featuredRows ?? []) as HomePublication[],
      departments: (deptRows ?? []) as HomeDepartment[],
      liveData: true,
    }
  } catch {
    // Network/schema issues — surface zeros instead of blocking the public
    // landing page or quietly substituting seed numbers.
    return empty
  }
}

export default async function Page() {
  const cookieStore = cookies()
  const lang = (cookieStore.get('lang')?.value === 'ar' ? 'ar' : 'en') as 'en' | 'ar'

  const { stats, featured, departments, liveData } = await fetchHomeData()

  return (
    <HomePage
      initialLang={lang}
      stats={stats}
      featured={featured}
      departments={departments}
      liveData={liveData}
    />
  )
}
