import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import HomePage, {
  type HomeDepartment,
  type HomePublication,
  type HomeStats,
} from '@/components/home/HomePage'
import { createPublicClient } from '@/lib/supabase-public'
import { DEMO_DEPARTMENTS, DEMO_RESEARCH, DEMO_STATS } from '@/lib/demo-data'

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

  // ---- Demo fallback ----
  const fallback: FetchResult = {
    stats: {
      active_projects: DEMO_STATS.active_projects,
      published_papers: DEMO_STATS.published_papers,
      total_departments: DEMO_STATS.total_departments,
      q1_publications: DEMO_STATS.q1_publications,
      open_access_count: DEMO_STATS.open_access_count,
      total_users: DEMO_STATS.total_users,
    },
    featured: DEMO_RESEARCH
      .filter(r => r.is_public || r.publication_status === 'published')
      .slice(0, 6)
      .map(r => ({
        id: r.id,
        research_id: r.research_id,
        title: r.title,
        title_ar: r.title_ar ?? null,
        journal_name: r.journal_name ?? null,
        publication_date: r.publication_date ?? null,
        journal_quartile: r.journal_quartile ?? null,
        is_open_access: r.is_open_access ?? null,
        principal_investigator_name: r.principal_investigator_name ?? null,
        department_id: r.department_id ?? null,
      })),
    departments: DEMO_DEPARTMENTS
      .slice()
      .sort((a, b) => b.research_count - a.research_count)
      .slice(0, 12)
      .map(d => ({
        id: d.id,
        name: d.name,
        name_ar: d.name_ar ?? null,
        code: d.code,
        color: d.color,
        research_count: d.research_count,
      })),
    liveData: false,
  }

  if (!supabase) return fallback

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
        active_projects: activeProjects ?? fallback.stats.active_projects,
        published_papers: publishedPapers ?? fallback.stats.published_papers,
        total_departments: totalDepartments ?? fallback.stats.total_departments,
        q1_publications: q1Publications ?? fallback.stats.q1_publications,
        open_access_count: openAccess ?? fallback.stats.open_access_count,
        total_users: totalUsers ?? fallback.stats.total_users,
      },
      featured: (featuredRows ?? fallback.featured) as HomePublication[],
      departments: (deptRows ?? fallback.departments) as HomeDepartment[],
      liveData: true,
    }
  } catch {
    // Network/schema issues — fall back transparently rather than blocking the
    // public landing page.
    return fallback
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
