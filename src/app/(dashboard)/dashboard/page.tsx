'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Activity, AlertTriangle, ArrowRight, BarChart2, Bell, BookOpen, Brain,
  Building2, Calendar, CheckCircle, ChevronRight, Clock, DollarSign, Eye,
  FlaskConical, Globe, Languages, Plus, Shield, Sparkles, Star, TrendingUp,
  Users,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

import { StatCard } from '@/components/dashboard/StatCard'
import {
  useAiInsights, useDepartments, useNotifications, useResearch, useStats,
} from '@/lib/data-source'
import { isDemoMode } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'
import { cn, daysUntil, getStatusBadgeClass, timeAgo } from '@/lib/utils'
import {
  ROLE_LABELS, WORKFLOW_STAGES,
  type DashboardStats, type Department, type ResearchProject,
} from '@/types'

// Empty defaults — used while the live Supabase query is in flight so the
// dashboard renders zeros / empty lists instead of fake demo numbers.
const EMPTY_STATS: DashboardStats = {
  total_projects: 0, active_projects: 0, completed_projects: 0, published_papers: 0,
  delayed_projects: 0, pending_irb: 0, upcoming_deadlines: 0,
  total_departments: 0, total_users: 0, this_month_new: 0,
  funded_projects: 0, total_budget: 0,
  q1_publications: 0, q2_publications: 0, q3_publications: 0, q4_publications: 0,
  open_access_count: 0,
}
const EMPTY_RESEARCH: ResearchProject[] = []
const EMPTY_DEPARTMENTS: Department[] = []

type Lang = 'en' | 'ar'

// ---------------- Translations ----------------

const T = {
  en: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    welcomeSub: 'Health & Nursing Research Unit · PMNH Jazan',
    newResearch: 'New Research',
    reports: 'Reports',
    languageBtn: 'العربية',
    liveData: 'Live data',
    demoData: 'Demo data — connect Supabase to switch to live database',
    kpiTotal: 'Total Projects',
    kpiActive: 'Active Research',
    kpiPublished: 'Published Papers',
    kpiDelayed: 'Delayed Projects',
    kpiSubTotal: 'across all departments',
    kpiSubActive: 'currently running',
    kpiSubPublished: 'in indexed journals',
    kpiSubDelayed: 'needs attention',
    kpiPendingIrb: 'Pending IRB',
    kpiCompleted: 'Completed',
    kpiNewMonth: 'New This Month',
    kpiBudget: 'Total Budget',
    activityTitle: 'Research Activity',
    activitySub: 'Monthly new, completed & published projects',
    statusTitle: 'Project Status',
    statusSub: 'Current distribution',
    deptPerfTitle: 'Department Performance',
    deptPerfSub: 'Projects vs publications by department',
    viewAll: 'View all',
    quartileTitle: 'Journal Quartiles',
    openAccess: 'Open Access',
    papersUnit: 'papers',
    quickStatsTitle: 'Quick Stats',
    departments: 'Departments',
    researchers: 'Researchers',
    funded: 'Funded Projects',
    dueThisWeek: 'Due This Week',
    aiTitle: 'AI Smart Insights',
    aiSub: 'Automated analysis & recommendations',
    allInsights: 'All insights',
    recentResearchTitle: 'Recent Research Projects',
    delayedTitle: 'Delayed Projects',
    delayedSub: 'Needs immediate attention',
    upcomingTitle: 'Upcoming Deadlines',
    upcomingSub: 'Milestones due in the next 30 days',
    notifTitle: 'Recent Notifications',
    notifSub: 'Latest activity in your portal',
    viewAllNotifs: 'See all',
    dueIn: 'due in {n} days',
    overdueBy: 'overdue by {n} days',
    none: 'Nothing here yet.',
    role: 'Role',
    department: 'Department',
    progress: 'Progress',
    status: 'Status',
    priority: 'Priority',
    stage: 'Stage',
    updated: 'Updated',
    title: 'Title',
    researchId: 'Research ID',
    new: 'New',
    completedLegend: 'Completed',
    publishedLegend: 'Published',
    projects: 'Projects',
    publishedShort: 'Published',
    statusActive: 'Active',
    statusCompletedShort: 'Completed',
    statusDelayed: 'Delayed',
    statusOnHold: 'On Hold',
    statusPending: 'Pending',
  },
  ar: {
    morning: 'صباح الخير',
    afternoon: 'مساء الخير',
    evening: 'مساء الخير',
    welcomeSub: 'وحدة الأبحاث الصحية والتمريضية · مستشفى الأمير محمد بن ناصر، جازان',
    newResearch: 'بحث جديد',
    reports: 'التقارير',
    languageBtn: 'English',
    liveData: 'بيانات مباشرة',
    demoData: 'بيانات تجريبية — قم بربط Supabase للتبديل إلى قاعدة بيانات حقيقية',
    kpiTotal: 'إجمالي المشاريع',
    kpiActive: 'الأبحاث النشطة',
    kpiPublished: 'الأبحاث المنشورة',
    kpiDelayed: 'المشاريع المتأخرة',
    kpiSubTotal: 'في جميع الأقسام',
    kpiSubActive: 'قيد التنفيذ حاليًا',
    kpiSubPublished: 'في مجلات مفهرسة',
    kpiSubDelayed: 'تتطلب اهتمامًا',
    kpiPendingIrb: 'بانتظار لجنة الأخلاقيات',
    kpiCompleted: 'مكتملة',
    kpiNewMonth: 'جديد هذا الشهر',
    kpiBudget: 'إجمالي الميزانية',
    activityTitle: 'نشاط الأبحاث',
    activitySub: 'مشاريع جديدة ومكتملة ومنشورة شهريًا',
    statusTitle: 'حالة المشاريع',
    statusSub: 'التوزيع الحالي',
    deptPerfTitle: 'أداء الأقسام',
    deptPerfSub: 'المشاريع مقابل المنشورات لكل قسم',
    viewAll: 'عرض الكل',
    quartileTitle: 'تصنيفات المجلات',
    openAccess: 'وصول مفتوح',
    papersUnit: 'بحث',
    quickStatsTitle: 'إحصائيات سريعة',
    departments: 'الأقسام',
    researchers: 'الباحثون',
    funded: 'مشاريع ممولة',
    dueThisWeek: 'مستحقة هذا الأسبوع',
    aiTitle: 'رؤى الذكاء الاصطناعي',
    aiSub: 'تحليل وتوصيات تلقائية',
    allInsights: 'جميع الرؤى',
    recentResearchTitle: 'أحدث المشاريع البحثية',
    delayedTitle: 'مشاريع متأخرة',
    delayedSub: 'تتطلب اهتمامًا فوريًا',
    upcomingTitle: 'مواعيد قادمة',
    upcomingSub: 'مراحل مستحقة خلال 30 يومًا',
    notifTitle: 'آخر الإشعارات',
    notifSub: 'أحدث النشاطات في بوابتك',
    viewAllNotifs: 'عرض الكل',
    dueIn: 'مستحقة خلال {n} يوم',
    overdueBy: 'متأخرة بـ {n} يوم',
    none: 'لا يوجد هنا بعد.',
    role: 'الدور',
    department: 'القسم',
    progress: 'الإنجاز',
    status: 'الحالة',
    priority: 'الأولوية',
    stage: 'المرحلة',
    updated: 'آخر تحديث',
    title: 'العنوان',
    researchId: 'الرمز',
    new: 'جديدة',
    completedLegend: 'مكتملة',
    publishedLegend: 'منشورة',
    projects: 'مشاريع',
    publishedShort: 'منشور',
    statusActive: 'نشطة',
    statusCompletedShort: 'مكتملة',
    statusDelayed: 'متأخرة',
    statusOnHold: 'مؤقتة',
    statusPending: 'بانتظار',
  },
} as const

function readLangCookie(): Lang {
  if (typeof document === 'undefined') return 'en'
  const m = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  return m?.[1] === 'ar' ? 'ar' : 'en'
}

function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

function greetingKey(date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const h = date.getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export default function DashboardPage() {
  // Every number on this page comes from Supabase. While the live query is
  // in flight each hook returns `data: null` — we substitute empty defaults
  // so the page renders zeros / blank lists rather than seeded demo numbers.
  const { data: statsData }        = useStats()
  const { data: researchData }     = useResearch()
  const { data: insightsData }     = useAiInsights()
  const { data: notificationData } = useNotifications()
  const { data: departmentsData }  = useDepartments()

  const stats         = statsData         ?? EMPTY_STATS
  const researchList  = researchData      ?? EMPTY_RESEARCH
  const aiInsights    = insightsData      ?? []
  const notifList     = notificationData  ?? []
  const departments   = departmentsData   ?? EMPTY_DEPARTMENTS

  const DEPT_BY_ID = useMemo(
    () => new Map(departments.map(d => [d.id, d])),
    [departments],
  )

  const { user } = useAuthStore()

  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => { setLang(readLangCookie()) }, [])
  useEffect(() => {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])

  const t = T[lang]
  const isRtl = lang === 'ar'

  // Derived lists — driven by the hook-backed data instead of importing
  // DEMO_* directly. Recomputes when the underlying query refetches.
  const delayed = useMemo(
    () =>
      researchList
        .filter(r => r.status === 'delayed' || (r.expected_completion_date && daysUntil(r.expected_completion_date) < 0 && r.status !== 'completed' && r.status !== 'cancelled'))
        .slice(0, 5),
    [researchList],
  )
  const upcoming = useMemo(
    () =>
      researchList
        .filter(r => r.expected_completion_date && daysUntil(r.expected_completion_date) >= 0 && daysUntil(r.expected_completion_date) <= 30)
        .sort((a, b) => daysUntil(a.expected_completion_date) - daysUntil(b.expected_completion_date))
        .slice(0, 5),
    [researchList],
  )
  const recent = useMemo(() => researchList.slice(0, 5), [researchList])
  const insights = useMemo(() => aiInsights.slice(0, 3), [aiInsights])
  const notifications = useMemo(() => notifList.slice(0, 4), [notifList])

  // Charts derived ------------------------------------------------
  const quartileData = useMemo(() => [
    { name: 'Q1', value: stats.q1_publications, color: '#7c3aed' },
    { name: 'Q2', value: stats.q2_publications, color: '#2563eb' },
    { name: 'Q3', value: stats.q3_publications, color: '#0891b2' },
    { name: 'Q4', value: stats.q4_publications, color: '#6b7280' },
  ], [stats])

  // Status pie — counted live from the research list.
  const statusPieData = useMemo(() => {
    const by = (s: ResearchProject['status']) => researchList.filter(r => r.status === s).length
    return [
      { name: t.statusActive,         value: by('active'),           color: '#22c55e' },
      { name: t.statusCompletedShort, value: by('completed'),        color: '#3b82f6' },
      { name: t.statusDelayed,        value: by('delayed'),          color: '#f97316' },
      { name: t.statusOnHold,         value: by('on_hold'),          color: '#6b7280' },
      { name: t.statusPending,        value: by('pending_approval'), color: '#f59e0b' },
    ]
  }, [researchList, t])

  // Monthly research activity for the current year — new / completed /
  // published bucketed by month, computed from real research_projects rows.
  const monthlyResearchData = useMemo(() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const year = new Date().getFullYear()
    const rows = months.map(m => ({ month: m, new: 0, completed: 0, published: 0 }))
    for (const r of researchList) {
      // "new" = created this year, bucketed by created_at month
      if (r.created_at?.startsWith(String(year))) {
        const idx = new Date(r.created_at).getMonth()
        if (idx >= 0 && idx <= 11) rows[idx].new += 1
      }
      // "completed" = actual_completion_date this year
      if (r.actual_completion_date?.startsWith(String(year))) {
        const idx = new Date(r.actual_completion_date).getMonth()
        if (idx >= 0 && idx <= 11) rows[idx].completed += 1
      }
      // "published" = publication_date this year
      if (r.publication_date?.startsWith(String(year))) {
        const idx = new Date(r.publication_date).getMonth()
        if (idx >= 0 && idx <= 11) rows[idx].published += 1
      }
    }
    return rows
  }, [researchList])

  // Per-department aggregates for the bar chart — name + project count +
  // published count. Top 8 departments by project count.
  const departmentPerformance = useMemo(() => {
    return departments.map(d => {
      const list = researchList.filter(r => r.department_id === d.id)
      return {
        dept: d.code || d.name.slice(0, 8),
        fullName: d.name,
        projects: list.length,
        published: list.filter(r => r.publication_status === 'published').length,
      }
    })
      .filter(d => d.projects > 0)
      .sort((a, b) => b.projects - a.projects)
      .slice(0, 8)
  }, [researchList, departments])

  // Total funded budget — live sum, formatted compactly.
  const formattedBudget = useMemo(() => {
    const total = researchList.reduce((s, r) => s + (r.budget ?? 0), 0)
    if (total === 0) return '0'
    if (total >= 1_000_000) return (total / 1_000_000).toFixed(2) + 'M'
    if (total >= 1_000) return (total / 1_000).toFixed(1) + 'K'
    return String(Math.round(total))
  }, [researchList])

  const firstName = (user?.full_name || '').split(' ')[0] || (lang === 'ar' ? 'الزائر' : 'there')

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-6">

      {/* ===== Welcome / page header ===== */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl text-white p-6 md:p-7"
        style={{ background: 'linear-gradient(135deg, #0f2460 0%, #1e3a8a 55%, #1d4ed8 100%)' }}
      >
        <div className="home-hero-grid absolute inset-0 opacity-30" aria-hidden />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/20 items-center justify-center">
              <img
                src="/jazan-health-cluster.jpg"
                alt="Jazan Health Cluster"
                className="w-9 h-9 object-contain"
                onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = '/hospital-logo.svg' }}
              />
            </div>
            <div>
              <p className="text-blue-200/85 text-xs font-semibold uppercase tracking-[0.18em]">
                {t[greetingKey()]}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight mt-1">
                {firstName ? `${t[greetingKey()]}, ${firstName}` : t[greetingKey()]}
              </h1>
              <p className="text-blue-100/80 text-sm mt-1">{t.welcomeSub}</p>
              {user?.role && (
                <p className="text-blue-200/70 text-xs mt-2 inline-flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  {t.role}: {ROLE_LABELS[user.role]}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors backdrop-blur"
              aria-label="Toggle language"
            >
              <Languages className="w-4 h-4" />
              {t.languageBtn}
            </button>
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors backdrop-blur"
            >
              <BarChart2 className="w-4 h-4" />
              {t.reports}
            </Link>
            <Link
              href="/research/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-white text-blue-800 hover:bg-blue-50 transition-colors shadow-lg"
            >
              <Plus className="w-4 h-4" />
              {t.newResearch}
            </Link>
          </div>
        </div>
        <div className="relative mt-4 flex items-center gap-1.5 text-[11px] text-blue-200/80">
          <span className={cn('inline-block w-1.5 h-1.5 rounded-full', isDemoMode ? 'bg-amber-400' : 'bg-emerald-400')} aria-hidden />
          {isDemoMode ? t.demoData : t.liveData}
        </div>
      </motion.div>

      {/* ===== Primary KPI cards ===== */}
      {/* `change` percentages are intentionally omitted — without a
          period-over-period baseline in the DB we can't compute them
          honestly, and showing fake deltas defeats the purpose. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t.kpiTotal} value={stats.total_projects} icon={FlaskConical}
          gradient="linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)"
          changeLabel={t.kpiSubTotal} index={0} />
        <StatCard title={t.kpiActive} value={stats.active_projects} icon={Activity}
          gradient="linear-gradient(135deg, #15803d 0%, #22c55e 100%)"
          changeLabel={t.kpiSubActive} index={1} />
        <StatCard title={t.kpiPublished} value={stats.published_papers} icon={BookOpen}
          gradient="linear-gradient(135deg, #6d28d9 0%, #a78bfa 100%)"
          changeLabel={t.kpiSubPublished} index={2} />
        <StatCard title={t.kpiDelayed} value={stats.delayed_projects} icon={AlertTriangle}
          gradient="linear-gradient(135deg, #c2410c 0%, #f97316 100%)"
          changeLabel={t.kpiSubDelayed} index={3} />
      </div>

      {/* ===== Secondary stats ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title={t.kpiPendingIrb} value={stats.pending_irb} icon={Shield}
          gradient="linear-gradient(135deg, #b45309 0%, #f59e0b 100%)" index={4} />
        <StatCard title={t.kpiCompleted} value={stats.completed_projects} icon={CheckCircle}
          gradient="linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)" index={5} />
        <StatCard title={t.kpiNewMonth} value={stats.this_month_new} icon={TrendingUp}
          gradient="linear-gradient(135deg, #9d174d 0%, #ec4899 100%)" index={6} />
        <StatCard title={t.kpiBudget} value={formattedBudget} icon={DollarSign} prefix="SAR "
          gradient="linear-gradient(135deg, #3730a3 0%, #6366f1 100%)" index={7} />
      </div>

      {/* ===== Charts row 1 ===== */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 premium-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-900">{t.activityTitle}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t.activitySub}</p>
            </div>
            <span className="badge bg-blue-100 text-blue-700 border-blue-200">{new Date().getFullYear()}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyResearchData}>
              <defs>
                <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPublished" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} reversed={isRtl} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} orientation={isRtl ? 'right' : 'left'} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="new"        stroke="#2563eb" fill="url(#colorNew)"        strokeWidth={2} name={t.new} />
              <Area type="monotone" dataKey="completed"  stroke="#22c55e" fill="url(#colorCompleted)"  strokeWidth={2} name={t.completedLegend} />
              <Area type="monotone" dataKey="published"  stroke="#7c3aed" fill="url(#colorPublished)"  strokeWidth={2} name={t.publishedLegend} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="premium-card p-5">
          <div className="mb-5">
            <h2 className="font-bold text-gray-900">{t.statusTitle}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t.statusSub}</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {statusPieData.map(s => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-gray-600 text-xs">{s.name}</span>
                </div>
                <span className="font-semibold text-gray-800 text-xs tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Charts row 2 ===== */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 premium-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-900">{t.deptPerfTitle}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{t.deptPerfSub}</p>
            </div>
            <Link href="/departments" className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1">
              {t.viewAll} <ChevronRight className={cn('w-3 h-3', isRtl && 'flip-rtl')} />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={departmentPerformance} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dept" tick={{ fontSize: 11, fill: '#9ca3af' }} reversed={isRtl} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} orientation={isRtl ? 'right' : 'left'} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="projects" fill="#3b82f6" name={t.projects} radius={[4, 4, 0, 0]} />
              <Bar dataKey="published" fill="#22c55e" name={t.publishedShort} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="premium-card p-5">
            <h2 className="font-bold text-gray-900 mb-4">{t.quartileTitle}</h2>
            <div className="space-y-3">
              {quartileData.map(q => (
                <div key={q.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ background: q.color }}>
                        {q.name}
                      </div>
                      <span className="text-gray-600 font-medium">Journal {q.name}</span>
                    </div>
                    <span className="font-bold text-gray-900 tabular-nums">{q.value}</span>
                  </div>
                  <div className="progress-bar">
                    <motion.div className="progress-fill" style={{ background: q.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(q.value / Math.max(1, stats.published_papers)) * 100}%` }}
                      transition={{ duration: 1, delay: 0.3 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-gray-500">{t.openAccess}</span>
              <span className="font-bold text-emerald-600 tabular-nums">
                {stats.open_access_count} {t.papersUnit}
              </span>
            </div>
          </div>

          <div className="premium-card p-5">
            <h2 className="font-bold text-gray-900 mb-3">{t.quickStatsTitle}</h2>
            <div className="space-y-2">
              {[
                { label: t.departments,   value: stats.total_departments,  icon: Building2, color: 'text-blue-600' },
                { label: t.researchers,    value: stats.total_users,        icon: Users,     color: 'text-purple-600' },
                { label: t.funded,         value: stats.funded_projects,    icon: DollarSign, color: 'text-green-600' },
                { label: t.dueThisWeek,    value: stats.upcoming_deadlines, icon: Calendar,  color: 'text-orange-600' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <item.icon className={cn('w-4 h-4', item.color)} />
                    <span className="text-gray-600 text-sm">{item.label}</span>
                  </div>
                  <span className="font-bold text-gray-900 text-sm tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Delayed / Upcoming / Notifications row ===== */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Delayed */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{t.delayedTitle}</h2>
                <p className="text-xs text-gray-500">{t.delayedSub}</p>
              </div>
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full tabular-nums">
              {delayed.length}
            </span>
          </div>
          {delayed.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">{t.none}</p>
          ) : (
            <ul className="space-y-2">
              {delayed.map(r => {
                const d = r.expected_completion_date ? daysUntil(r.expected_completion_date) : 0
                return (
                  <li key={r.id}>
                    <Link
                      href={`/research/${r.id}`}
                      className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-orange-50/60 transition-colors group"
                    >
                      <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5">
                        {r.research_id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700">{r.title}</p>
                        <p className="text-[11px] text-orange-600 font-medium mt-0.5">
                          {format(t.overdueBy, { n: Math.abs(d) })}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Upcoming */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{t.upcomingTitle}</h2>
                <p className="text-xs text-gray-500">{t.upcomingSub}</p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full tabular-nums">
              {upcoming.length}
            </span>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">{t.none}</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map(r => {
                const d = daysUntil(r.expected_completion_date)
                return (
                  <li key={r.id}>
                    <Link
                      href={`/research/${r.id}`}
                      className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-blue-50/60 transition-colors group"
                    >
                      <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5">
                        {r.research_id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700">{r.title}</p>
                        <p className="text-[11px] text-blue-600 font-medium mt-0.5">
                          {format(t.dueIn, { n: d })}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Notifications */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                <Bell className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{t.notifTitle}</h2>
                <p className="text-xs text-gray-500">{t.notifSub}</p>
              </div>
            </div>
            <Link href="/notifications" className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 whitespace-nowrap">
              {t.viewAllNotifs} <ChevronRight className={cn('w-3 h-3', isRtl && 'flip-rtl')} />
            </Link>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">{t.none}</p>
          ) : (
            <ul className="space-y-1">
              {notifications.map(n => (
                <li key={n.id}>
                  <Link
                    href={n.action_url || '/notifications'}
                    className={cn(
                      'flex items-start gap-3 rounded-xl p-2.5 transition-colors',
                      n.is_read ? 'hover:bg-gray-50' : 'bg-blue-50/50 hover:bg-blue-50',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1 inline-block w-2 h-2 rounded-full flex-shrink-0',
                        n.is_read ? 'bg-gray-300' : 'bg-blue-500',
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ===== AI Insights ===== */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{t.aiTitle}</h2>
              <p className="text-xs text-gray-500">{t.aiSub}</p>
            </div>
          </div>
          <Link href="/ai-insights" className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1">
            {t.allInsights} <ChevronRight className={cn('w-3 h-3', isRtl && 'flip-rtl')} />
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {insights.map((insight, i) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                'rounded-xl p-4 border',
                insight.type === 'warning'        && 'bg-orange-50 border-orange-200',
                insight.type === 'recommendation' && 'bg-blue-50 border-blue-200',
                insight.type === 'success'        && 'bg-green-50 border-green-200',
                insight.type === 'info'           && 'bg-purple-50 border-purple-200',
              )}
            >
              <div className="flex items-start gap-2.5">
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                  insight.type === 'warning'        && 'bg-orange-100',
                  insight.type === 'recommendation' && 'bg-blue-100',
                  insight.type === 'success'        && 'bg-green-100',
                  insight.type === 'info'           && 'bg-purple-100',
                )}>
                  <Sparkles className={cn(
                    'w-3.5 h-3.5',
                    insight.type === 'warning'        && 'text-orange-600',
                    insight.type === 'recommendation' && 'text-blue-600',
                    insight.type === 'success'        && 'text-green-600',
                    insight.type === 'info'           && 'text-purple-600',
                  )} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{insight.title}</p>
                  <p className="text-gray-600 text-xs mt-1 line-clamp-3">{insight.message}</p>
                  {insight.score !== undefined && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${insight.score}%`,
                            background:
                              insight.type === 'warning' ? '#f97316' :
                              insight.type === 'success' ? '#22c55e' :
                              insight.type === 'info'    ? '#8b5cf6' :
                              '#3b82f6',
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 tabular-nums">{insight.score}%</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ===== Recent Research ===== */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <h2 className="font-bold text-gray-900">{t.recentResearchTitle}</h2>
          </div>
          <Link href="/research" className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1">
            {t.viewAll} <ChevronRight className={cn('w-3 h-3', isRtl && 'flip-rtl')} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.researchId}</th>
                <th>{t.title}</th>
                <th>{t.department}</th>
                <th>{t.stage}</th>
                <th>{t.status}</th>
                <th>{t.priority}</th>
                <th>{t.progress}</th>
                <th>{t.updated}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent.map(r => {
                const stage = WORKFLOW_STAGES[r.workflow_stage]
                const dept = r.department_id ? DEPT_BY_ID.get(r.department_id) : undefined
                return (
                  <tr key={r.id}>
                    <td>
                      <span className="font-mono text-xs font-semibold text-blue-700">{r.research_id}</span>
                    </td>
                    <td>
                      <p className="font-medium text-gray-900 max-w-xs truncate text-xs">{r.title}</p>
                    </td>
                    <td>
                      {dept ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold"
                          style={{ background: dept.color + '18', color: dept.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: dept.color }} />
                          {dept.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                        style={{ background: stage.color + '20', color: stage.color }}
                      >
                        {stage.label}
                      </span>
                    </td>
                    <td>
                      <span className={cn('badge text-xs capitalize', getStatusBadgeClass(r.status))}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={cn('badge text-xs capitalize', getStatusBadgeClass(r.priority_level))}>
                        {r.priority_level}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${r.completion_percentage}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 tabular-nums">{r.completion_percentage}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-gray-400">{timeAgo(r.updated_at)}</span>
                    </td>
                    <td>
                      <Link
                        href={`/research/${r.id}`}
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
