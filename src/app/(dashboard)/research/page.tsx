'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  AlertTriangle, ArchiveRestore, ArrowUpDown, BookOpen, Building2,
  CheckCircle, ChevronLeft, ChevronRight, Download, Eye, FileSpreadsheet,
  Filter, FlaskConical, Globe, Languages, LayoutGrid, List, Plus, QrCode,
  Search, SlidersHorizontal, Users, X,
} from 'lucide-react'

import { useAuthStore } from '@/lib/auth-store'
import { deleteResearch, useDepartments, useResearch } from '@/lib/data-source'
import { canDelete } from '@/lib/permissions'
import {
  cn, formatDate, getPriorityClass, getStatusBadgeClass, truncate,
} from '@/lib/utils'
import {
  WORKFLOW_STAGES, type Department, type PriorityLevel, type ResearchProject,
  type ResearchStatus, type WorkflowStage,
} from '@/types'

// Stable empty seeds — keep the page's filter / pagination / summary code
// honest when Supabase hasn't replied yet. We deliberately don't fall back
// to DEMO_* in production: that used to mask real auth/RLS failures with
// 8 ghost rows that looked legitimate while the live database had 16.
const EMPTY_RESEARCH: ResearchProject[] = []
const EMPTY_DEPARTMENTS: Department[] = []

type Lang = 'en' | 'ar'
type ViewMode = 'table' | 'cards'
// Widened (non-literal) translation shape used when passing `t` across
// component boundaries — `as const` would otherwise narrow each key to its
// literal English value.
type Translations = { [K in keyof (typeof T)['en']]: string }

// ---------------- Translations ----------------

const T = {
  en: {
    title: 'Research Database',
    subtitle: 'All research projects across PMNH departments',
    addResearch: 'Add Research',
    importExcel: 'Import Excel / CSV',
    export: 'Export',
    exportCsv: 'Export as CSV',
    exportXlsx: 'Export as Excel',
    languageBtn: 'العربية',
    liveData: 'Live data',
    demoData: 'Demo data — connect Supabase for live records',
    chipAll: 'All',
    chipActive: 'Active',
    chipDelayed: 'Delayed',
    chipCompleted: 'Completed',
    chipPublished: 'Published',
    chipPendingIrb: 'Pending IRB',
    summaryTotal: 'Total',
    summaryActive: 'Active',
    summaryDelayed: 'Delayed',
    summaryPublished: 'Published',
    searchPh: 'Search by title, ID, investigator, category…',
    allStatus: 'All status',
    allDepts: 'All departments',
    allStages: 'All workflow stages',
    allPriorities: 'All priorities',
    moreFilters: 'Filters',
    clearAll: 'Clear filters',
    showing: 'Showing {n} of {total} results',
    sortBy: 'Sort by',
    sortUpdated: 'Last updated',
    sortCreated: 'Date created',
    sortTitle: 'Title',
    sortPriority: 'Priority',
    viewTable: 'Table',
    viewCards: 'Cards',
    colResearchId: 'Research ID',
    colTitle: 'Title',
    colPi: 'Principal Investigator',
    colDept: 'Department',
    colStage: 'Stage',
    colStatus: 'Status',
    colPriority: 'Priority',
    colProgress: 'Progress',
    colIrb: 'IRB',
    colExpected: 'Expected',
    colActions: 'Actions',
    emptyTitle: 'No research projects match your filters',
    emptySub: 'Try adjusting your search, clearing filters, or adding a new project.',
    actionView: 'View details',
    actionQr: 'QR code',
    actionArchive: 'Archive',
    pageOf: 'Page {p} of {total}',
    prev: 'Previous',
    next: 'Next',
    perPage: 'per page',
    archived: 'Project archived (demo only).',
    exportedCsv: 'CSV exported.',
    exportedXlsx: 'Excel file exported.',
    statusActive: 'Active',
    statusCompleted: 'Completed',
    statusDelayed: 'Delayed',
    statusOnHold: 'On hold',
    statusPendingApproval: 'Pending approval',
    statusCancelled: 'Cancelled',
    priorityLow: 'Low', priorityMedium: 'Medium', priorityHigh: 'High', priorityCritical: 'Critical',
  },
  ar: {
    title: 'قاعدة بيانات الأبحاث',
    subtitle: 'جميع المشاريع البحثية في أقسام المستشفى',
    addResearch: 'إضافة بحث',
    importExcel: 'استيراد Excel / CSV',
    export: 'تصدير',
    exportCsv: 'تصدير CSV',
    exportXlsx: 'تصدير Excel',
    languageBtn: 'English',
    liveData: 'بيانات مباشرة',
    demoData: 'بيانات تجريبية — قم بربط Supabase للسجلات الحقيقية',
    chipAll: 'الكل',
    chipActive: 'نشطة',
    chipDelayed: 'متأخرة',
    chipCompleted: 'مكتملة',
    chipPublished: 'منشورة',
    chipPendingIrb: 'بانتظار اللجنة',
    summaryTotal: 'الإجمالي',
    summaryActive: 'نشطة',
    summaryDelayed: 'متأخرة',
    summaryPublished: 'منشورة',
    searchPh: 'ابحث بالعنوان، الرمز، الباحث، التصنيف…',
    allStatus: 'جميع الحالات',
    allDepts: 'جميع الأقسام',
    allStages: 'جميع المراحل',
    allPriorities: 'جميع الأولويات',
    moreFilters: 'فلاتر',
    clearAll: 'مسح الفلاتر',
    showing: 'عرض {n} من {total} نتيجة',
    sortBy: 'الترتيب',
    sortUpdated: 'آخر تحديث',
    sortCreated: 'تاريخ الإنشاء',
    sortTitle: 'العنوان',
    sortPriority: 'الأولوية',
    viewTable: 'جدول',
    viewCards: 'بطاقات',
    colResearchId: 'الرمز',
    colTitle: 'العنوان',
    colPi: 'الباحث الرئيسي',
    colDept: 'القسم',
    colStage: 'المرحلة',
    colStatus: 'الحالة',
    colPriority: 'الأولوية',
    colProgress: 'الإنجاز',
    colIrb: 'الأخلاقيات',
    colExpected: 'موعد الانتهاء',
    colActions: 'إجراءات',
    emptyTitle: 'لا توجد مشاريع تطابق فلاترك',
    emptySub: 'حاول تعديل البحث، أو إزالة الفلاتر، أو إضافة مشروع جديد.',
    actionView: 'عرض التفاصيل',
    actionQr: 'رمز QR',
    actionArchive: 'أرشفة',
    pageOf: 'صفحة {p} من {total}',
    prev: 'السابق',
    next: 'التالي',
    perPage: 'لكل صفحة',
    archived: 'تمت أرشفة المشروع (تجريبي).',
    exportedCsv: 'تم تصدير CSV.',
    exportedXlsx: 'تم تصدير ملف Excel.',
    statusActive: 'نشط',
    statusCompleted: 'مكتمل',
    statusDelayed: 'متأخر',
    statusOnHold: 'موقوف',
    statusPendingApproval: 'بانتظار الموافقة',
    statusCancelled: 'ملغي',
    priorityLow: 'منخفضة', priorityMedium: 'متوسطة', priorityHigh: 'عالية', priorityCritical: 'حرجة',
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

const STATUS_OPTIONS: { value: ResearchStatus | 'all'; key: keyof (typeof T)['en'] }[] = [
  { value: 'all', key: 'allStatus' },
  { value: 'active', key: 'statusActive' },
  { value: 'completed', key: 'statusCompleted' },
  { value: 'delayed', key: 'statusDelayed' },
  { value: 'on_hold', key: 'statusOnHold' },
  { value: 'pending_approval', key: 'statusPendingApproval' },
  { value: 'cancelled', key: 'statusCancelled' },
]
const PRIORITY_OPTIONS: { value: PriorityLevel | 'all'; key: keyof (typeof T)['en'] }[] = [
  { value: 'all', key: 'allPriorities' },
  { value: 'low', key: 'priorityLow' },
  { value: 'medium', key: 'priorityMedium' },
  { value: 'high', key: 'priorityHigh' },
  { value: 'critical', key: 'priorityCritical' },
]

const QUICK_CHIPS = [
  { id: 'all',       icon: FlaskConical,  color: 'blue'   },
  { id: 'active',    icon: CheckCircle,   color: 'green'  },
  { id: 'delayed',   icon: AlertTriangle, color: 'orange' },
  { id: 'completed', icon: CheckCircle,   color: 'cyan'   },
  { id: 'published', icon: BookOpen,      color: 'purple' },
  { id: 'pending_irb', icon: FlaskConical, color: 'amber' },
] as const
type QuickChip = (typeof QUICK_CHIPS)[number]['id']

// CSV export helper — escapes commas, quotes, and newlines per RFC 4180.
function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  return rows
    .map(row =>
      row
        .map(cell => {
          const s = cell == null ? '' : String(cell)
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(','),
    )
    .join('\r\n')
}
function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ResearchPage() {
  // Role gate for the destructive Trash button. Admin role can view + edit
  // research projects but cannot delete them — that power is reserved for
  // the Super Admin per spec, and is enforced server-side by the RLS
  // policy `research_delete_super_admin_only` (migration 008).
  const userRole = useAuthStore(s => s.user?.role)
  const userCanDelete = canDelete(userRole)

  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => { setLang(readLangCookie()) }, [])
  useEffect(() => {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])
  const t = T[lang]
  const isRtl = lang === 'ar'

  // Filter state ------------------------------------------------
  const [search, setSearch] = useState('')
  const [quickChip, setQuickChip] = useState<QuickChip>('all')
  const [statusFilter, setStatusFilter] = useState<ResearchStatus | 'all'>('all')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<WorkflowStage | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<'updated_at'|'created_at'|'title'|'priority_level'>('updated_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [exportMenu, setExportMenu] = useState(false)
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set())

  // Live data via the data-source hook. In production we resolve to an empty
  // list while Supabase is still in-flight (and on hard error) rather than
  // shimming in DEMO_RESEARCH — the demo seed has 8 rows and was making the
  // page look like it only contained 8 of the real 16 records.
  const { data: researchData, loading: researchLoading } = useResearch()
  const researchList: ResearchProject[] = researchData ?? EMPTY_RESEARCH

  // Live departments — used to draw the badge + populate the filter dropdown
  // with real UUIDs that match what the rows actually reference. The old
  // module-level `DEPT_BY_ID = DEMO_DEPARTMENTS` map silently returned
  // undefined for every real row because the seed used short ids ("d1"...).
  const { data: deptData } = useDepartments()
  const departments: Department[] = deptData ?? EMPTY_DEPARTMENTS
  const DEPT_BY_ID = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments])

  // Filter pipeline --------------------------------------------
  const filtered = useMemo(() => {
    let data: ResearchProject[] = researchList.filter(r => !archivedIds.has(r.id))

    if (quickChip === 'active') data = data.filter(r => r.status === 'active')
    else if (quickChip === 'delayed') data = data.filter(r => r.status === 'delayed')
    else if (quickChip === 'completed') data = data.filter(r => r.status === 'completed')
    else if (quickChip === 'published') data = data.filter(r => r.publication_status === 'published')
    else if (quickChip === 'pending_irb') data = data.filter(r => r.irb_approval_status === 'pending')

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.research_id.toLowerCase().includes(q) ||
        (r.principal_investigator_name || '').toLowerCase().includes(q) ||
        (r.research_category || '').toLowerCase().includes(q),
      )
    }
    if (statusFilter !== 'all')   data = data.filter(r => r.status === statusFilter)
    if (deptFilter !== 'all')     data = data.filter(r => r.department_id === deptFilter)
    if (stageFilter !== 'all')    data = data.filter(r => r.workflow_stage === stageFilter)
    if (priorityFilter !== 'all') data = data.filter(r => r.priority_level === priorityFilter)

    const sorted = [...data].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortField] as string
      const bv = (b as unknown as Record<string, unknown>)[sortField] as string
      if (av === bv) return 0
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
    return sorted
  }, [researchList, archivedIds, quickChip, search, statusFilter, deptFilter, stageFilter, priorityFilter, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage)

  // Reset page when filters change.
  useEffect(() => { setPage(1) }, [search, quickChip, statusFilter, deptFilter, stageFilter, priorityFilter, perPage])

  const summaryStats = useMemo(() => {
    const visible = researchList.filter(r => !archivedIds.has(r.id))
    return [
      { key: t.summaryTotal,     value: visible.length, color: 'blue',   icon: FlaskConical },
      { key: t.summaryActive,    value: visible.filter(r => r.status === 'active').length, color: 'green',  icon: CheckCircle },
      { key: t.summaryDelayed,   value: visible.filter(r => r.status === 'delayed').length, color: 'orange', icon: AlertTriangle },
      { key: t.summaryPublished, value: visible.filter(r => r.publication_status === 'published').length, color: 'purple', icon: BookOpen },
    ]
  }, [researchList, archivedIds, t])

  const activeFilterCount =
    (search ? 1 : 0) +
    (quickChip !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (deptFilter !== 'all' ? 1 : 0) +
    (stageFilter !== 'all' ? 1 : 0) +
    (priorityFilter !== 'all' ? 1 : 0)

  // Actions ----------------------------------------------------
  function clearAllFilters() {
    setSearch(''); setQuickChip('all')
    setStatusFilter('all'); setDeptFilter('all')
    setStageFilter('all'); setPriorityFilter('all')
  }

  function buildExportRows(): string[][] {
    const header = [
      'Research ID', 'Title', 'Principal Investigator', 'Department', 'Category',
      'Workflow Stage', 'Status', 'Priority', 'Completion %', 'IRB Status',
      'Expected Completion', 'Publication Status', 'Journal', 'DOI', 'Publication Date',
    ]
    const rows = filtered.map(r => [
      r.research_id,
      r.title,
      r.principal_investigator_name || '',
      DEPT_BY_ID.get(r.department_id || '')?.name || '',
      r.research_category || '',
      WORKFLOW_STAGES[r.workflow_stage].label,
      r.status,
      r.priority_level,
      String(r.completion_percentage),
      r.irb_approval_status,
      r.expected_completion_date || '',
      r.publication_status,
      r.journal_name || '',
      r.doi || '',
      r.publication_date || '',
    ])
    return [header, ...rows]
  }

  function exportCsv() {
    const csv = toCsv(buildExportRows())
    downloadBlob('﻿' + csv, `research-database-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8')
    toast.success(t.exportedCsv)
    setExportMenu(false)
  }

  async function exportXlsx() {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet(buildExportRows())
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Research')
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    downloadBlob(out, `research-database-${new Date().toISOString().slice(0,10)}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    toast.success(t.exportedXlsx)
    setExportMenu(false)
  }

  /**
   * Archive = real DELETE in Supabase when the row has a UUID id (i.e. it
   * came from the database), local hide for the seed catalog otherwise.
   * On a successful Supabase delete the refresh-signal in data-source
   * fires and useResearch() re-fetches, so the row disappears from the
   * list immediately — no manual reload needed.
   */
  async function archive(id: string) {
    if (!userCanDelete) {
      toast.error('الحذف مقيّد على المسؤول العام فقط.')
      return
    }
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isUuid = UUID_RE.test(id)
    if (!confirm('Delete this research project? This cannot be undone.')) return

    if (!isUuid) {
      // Local seed row — just hide it.
      setArchivedIds(prev => {
        const next = new Set(prev); next.add(id); return next
      })
      toast(t.archived, { icon: '🗄️' })
      return
    }

    const result = await deleteResearch(id)
    if (!result.ok) {
      toast.error(`Could not delete: ${result.error}`)
      return
    }
    toast.success('Research project deleted.')
    // useResearch() already refetched via the refresh signal — the row
    // is gone from the list. No need to touch archivedIds.
  }

  // ---------- helpers used in rendering ----------
  const localizedStatusLabel = (s: ResearchStatus) => {
    const key = (
      s === 'active' ? 'statusActive'
      : s === 'completed' ? 'statusCompleted'
      : s === 'delayed' ? 'statusDelayed'
      : s === 'on_hold' ? 'statusOnHold'
      : s === 'pending_approval' ? 'statusPendingApproval'
      : 'statusCancelled'
    ) as keyof (typeof T)['en']
    return t[key]
  }
  const localizedPriorityLabel = (p: PriorityLevel) => {
    const key = (
      p === 'low' ? 'priorityLow'
      : p === 'medium' ? 'priorityMedium'
      : p === 'high' ? 'priorityHigh'
      : 'priorityCritical'
    ) as keyof (typeof T)['en']
    return t[key]
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5">

      {/* ===== Page header ===== */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-subtitle">
            {t.subtitle}
            <span className="mx-2 text-gray-300" aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5 text-xs">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden />
              {t.liveData}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="btn-secondary text-sm"
            aria-label="Toggle language"
          >
            <Languages className="w-4 h-4" />
            {t.languageBtn}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenu(m => !m)}
              className="btn-secondary text-sm"
            >
              <Download className="w-4 h-4" />
              {t.export}
            </button>
            {exportMenu && (
              <div
                className={cn(
                  'absolute z-30 mt-1 w-44 rounded-xl bg-white shadow-lg ring-1 ring-gray-200 py-1',
                  isRtl ? 'start-0' : 'end-0',
                )}
                onMouseLeave={() => setExportMenu(false)}
              >
                <button
                  type="button"
                  onClick={exportCsv}
                  className="w-full text-start px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  {t.exportCsv}
                </button>
                <button
                  type="button"
                  onClick={exportXlsx}
                  className="w-full text-start px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  {t.exportXlsx}
                </button>
              </div>
            )}
          </div>
          <Link href="/research/import" className="btn-secondary text-sm">
            <FileSpreadsheet className="w-4 h-4" />
            {t.importExcel}
          </Link>
          <Link href="/research/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            {t.addResearch}
          </Link>
        </div>
      </div>

      {/* ===== Summary cards ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryStats.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              'premium-card p-4 flex items-center gap-3',
              s.color === 'blue'   && (isRtl ? 'border-r-4 border-r-blue-500'   : 'border-l-4 border-l-blue-500'),
              s.color === 'green'  && (isRtl ? 'border-r-4 border-r-green-500'  : 'border-l-4 border-l-green-500'),
              s.color === 'orange' && (isRtl ? 'border-r-4 border-r-orange-500' : 'border-l-4 border-l-orange-500'),
              s.color === 'purple' && (isRtl ? 'border-r-4 border-r-purple-500' : 'border-l-4 border-l-purple-500'),
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              s.color === 'blue' && 'bg-blue-100',
              s.color === 'green' && 'bg-green-100',
              s.color === 'orange' && 'bg-orange-100',
              s.color === 'purple' && 'bg-purple-100',
            )}>
              <s.icon className={cn(
                'w-5 h-5',
                s.color === 'blue' && 'text-blue-600',
                s.color === 'green' && 'text-green-600',
                s.color === 'orange' && 'text-orange-600',
                s.color === 'purple' && 'text-purple-600',
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p>
              <p className="text-xs text-gray-500">{s.key}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ===== Quick chips ===== */}
      <div className="flex flex-wrap gap-2">
        {QUICK_CHIPS.map(chip => {
          const labelKey = (
            chip.id === 'all' ? 'chipAll'
            : chip.id === 'active' ? 'chipActive'
            : chip.id === 'delayed' ? 'chipDelayed'
            : chip.id === 'completed' ? 'chipCompleted'
            : chip.id === 'published' ? 'chipPublished'
            : 'chipPendingIrb'
          ) as keyof (typeof T)['en']
          const Icon = chip.icon
          const active = quickChip === chip.id
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setQuickChip(chip.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border',
                active
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t[labelKey]}
            </button>
          )
        })}
      </div>

      {/* ===== Search & filters ===== */}
      <div className="premium-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400', isRtl ? 'right-3' : 'left-3')} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.searchPh}
              className={cn('form-input', isRtl ? 'pe-9' : 'ps-9')}
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as ResearchStatus | 'all')}
            className="form-input w-auto min-w-[150px]"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {t[o.key]}
              </option>
            ))}
          </select>

          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="form-input w-auto min-w-[160px]"
          >
            <option value="all">{t.allDepts}</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowFilters(s => !s)}
            className={cn(
              'btn-secondary text-sm',
              showFilters && 'bg-blue-50 border-blue-300 text-blue-700',
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t.moreFilters}
            {(stageFilter !== 'all' || priorityFilter !== 'all') && (
              <span className="w-4 h-4 bg-blue-600 rounded-full text-white text-[10px] flex items-center justify-center">!</span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm text-red-500 hover:text-red-700 inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> {t.clearAll}
            </button>
          )}

          <div className="ms-auto flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors',
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-800',
              )}
            >
              <List className="w-3.5 h-3.5" />
              {t.viewTable}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors',
                viewMode === 'cards' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-800',
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {t.viewCards}
            </button>
          </div>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100"
          >
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value as WorkflowStage | 'all')}
              className="form-input w-auto min-w-[200px]"
            >
              <option value="all">{t.allStages}</option>
              {Object.entries(WORKFLOW_STAGES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value as PriorityLevel | 'all')}
              className="form-input w-auto min-w-[160px]"
            >
              {PRIORITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{t[o.key]}</option>
              ))}
            </select>
          </motion.div>
        )}
      </div>

      {/* ===== Results bar ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
        <span className="tabular-nums">
          {format(t.showing, { n: paginated.length, total: filtered.length })}
        </span>
        <div className="flex items-center gap-2">
          <span>{t.sortBy}:</span>
          <select
            value={sortField}
            onChange={e => setSortField(e.target.value as typeof sortField)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none bg-white"
          >
            <option value="updated_at">{t.sortUpdated}</option>
            <option value="created_at">{t.sortCreated}</option>
            <option value="title">{t.sortTitle}</option>
            <option value="priority_level">{t.sortPriority}</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
            className="text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded transition-colors"
            aria-label="Toggle sort direction"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===== Results ===== */}
      {filtered.length === 0 ? (
        <div className="premium-card p-16 text-center">
          {researchLoading ? (
            <>
              <div className="w-10 h-10 mx-auto mb-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="font-semibold text-gray-700">{lang === 'ar' ? 'جاري تحميل السجلات…' : 'Loading records…'}</p>
            </>
          ) : (
            <>
              <FlaskConical className="w-14 h-14 mx-auto mb-4 text-gray-300" />
              <p className="font-semibold text-gray-700">{t.emptyTitle}</p>
              <p className="text-sm text-gray-500 mt-1">{t.emptySub}</p>
            </>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.colResearchId}</th>
                  <th className="min-w-[260px]">{t.colTitle}</th>
                  <th>{t.colPi}</th>
                  <th>{t.colDept}</th>
                  <th>{t.colStage}</th>
                  <th>{t.colStatus}</th>
                  <th>{t.colPriority}</th>
                  <th>{t.colProgress}</th>
                  <th>{t.colIrb}</th>
                  <th>{t.colExpected}</th>
                  <th>{t.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(r => {
                  const stage = WORKFLOW_STAGES[r.workflow_stage]
                  const dept = r.department_id ? DEPT_BY_ID.get(r.department_id) : undefined
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="font-mono text-xs font-bold text-blue-700">{r.research_id}</span>
                      </td>
                      <td>
                        <Link href={`/research/${r.id}`} className="block hover:text-blue-700 transition-colors">
                          <p className="font-medium text-gray-900 text-xs">{truncate(r.title, 72)}</p>
                          {r.research_category && (
                            <span className="text-[11px] text-gray-400">{r.research_category}</span>
                          )}
                        </Link>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-700">
                          <Users className="w-3 h-3 text-gray-400" />
                          {r.principal_investigator_name || '—'}
                        </span>
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
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium whitespace-nowrap"
                          style={{ background: stage.color + '20', color: stage.color }}
                        >
                          {stage.label}
                        </span>
                      </td>
                      <td>
                        <span className={cn('badge text-xs', getStatusBadgeClass(r.status))}>
                          {localizedStatusLabel(r.status)}
                        </span>
                      </td>
                      <td>
                        <span className={cn('badge text-xs', getPriorityClass(r.priority_level))}>
                          {localizedPriorityLabel(r.priority_level)}
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
                        <span className={cn('badge text-xs capitalize', getStatusBadgeClass(r.irb_approval_status))}>
                          {r.irb_approval_status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-gray-600 whitespace-nowrap">
                          {formatDate(r.expected_completion_date)}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/research/${r.id}`}
                            title={t.actionView}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href={`/qr-codes?research=${r.id}`}
                            title={t.actionQr}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </Link>
                          {userCanDelete && (
                            <button
                              type="button"
                              onClick={() => archive(r.id)}
                              title={t.actionArchive}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                            >
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={safePage}
            totalPages={totalPages}
            perPage={perPage}
            setPage={setPage}
            setPerPage={setPerPage}
            t={t}
            isRtl={isRtl}
          />
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map(r => {
              const stage = WORKFLOW_STAGES[r.workflow_stage]
              const dept = r.department_id ? DEPT_BY_ID.get(r.department_id) : undefined
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="premium-card p-4 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {r.research_id}
                    </span>
                    <span className={cn('badge text-[11px]', getStatusBadgeClass(r.status))}>
                      {localizedStatusLabel(r.status)}
                    </span>
                  </div>

                  <Link href={`/research/${r.id}`} className="block">
                    <h3 className="font-bold text-gray-900 text-sm leading-snug hover:text-blue-700 transition-colors line-clamp-3">
                      {r.title}
                    </h3>
                    {r.research_category && (
                      <p className="text-[11px] text-gray-400 mt-1">{r.research_category}</p>
                    )}
                  </Link>

                  <div className="mt-3 space-y-1.5 text-[11px] text-gray-600">
                    {r.principal_investigator_name && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Users className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        {r.principal_investigator_name}
                      </p>
                    )}
                    {dept && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3 h-3 flex-shrink-0" style={{ color: dept.color }} />
                        <span className="font-semibold" style={{ color: dept.color }}>{dept.name}</span>
                      </p>
                    )}
                  </div>

                  <div
                    className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium w-fit"
                    style={{ background: stage.color + '20', color: stage.color }}
                  >
                    {stage.label}
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                      <span>{t.colProgress}</span>
                      <span className="font-bold tabular-nums">{r.completion_percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${r.completion_percentage}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">
                      {formatDate(r.expected_completion_date)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/research/${r.id}`}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        title={t.actionView}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href={`/qr-codes?research=${r.id}`}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
                        title={t.actionQr}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </Link>
                      {userCanDelete && (
                        <button
                          type="button"
                          onClick={() => archive(r.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                          title={t.actionArchive}
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
          <Pagination
            page={safePage}
            totalPages={totalPages}
            perPage={perPage}
            setPage={setPage}
            setPerPage={setPerPage}
            t={t}
            isRtl={isRtl}
          />
        </>
      )}
    </div>
  )
}

function Pagination({
  page, totalPages, perPage, setPage, setPerPage, t, isRtl,
}: {
  page: number; totalPages: number; perPage: number
  setPage: (p: number) => void; setPerPage: (n: number) => void
  t: Translations; isRtl: boolean
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 flex-wrap">
      <p className="text-sm text-gray-500">{format(t.pageOf, { p: page, total: totalPages })}</p>
      <div className="flex items-center gap-2">
        <select
          value={perPage}
          onChange={e => setPerPage(Number(e.target.value))}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
        >
          {[10, 20, 50].map(n => (
            <option key={n} value={n}>{n} {t.perPage}</option>
          ))}
        </select>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition-colors inline-flex items-center gap-1"
          >
            {isRtl ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            {t.prev}
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const n = page <= 3 ? i + 1 : page - 2 + i
            if (n > totalPages) return null
            return (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg border transition-colors tabular-nums',
                  page === n ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50',
                )}
              >
                {n}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition-colors inline-flex items-center gap-1"
          >
            {t.next}
            {isRtl ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
