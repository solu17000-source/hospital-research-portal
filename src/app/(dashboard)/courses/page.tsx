'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Building2, Calendar, CheckCircle, ExternalLink, FileSpreadsheet, GraduationCap,
  Languages, MapPin, Plus, QrCode, Search, Sparkles, Trash2, User as UserIcon,
  Users, X,
} from 'lucide-react'

import { DEMO_DEPARTMENTS } from '@/lib/demo-data'
import { format, useLang } from '@/lib/i18n'
import { isDemoMode } from '@/lib/supabase'
import { cn, formatDate } from '@/lib/utils'

type CourseType = 'workshop' | 'training' | 'seminar' | 'short_course'
type CourseStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

type Course = {
  id: string
  title: string
  title_ar?: string
  type: CourseType
  date: string
  time: string
  location: string
  trainer: string
  audience: string
  department_id?: string
  participants_count: number
  capacity: number
  status: CourseStatus
  registration_url?: string
  google_form_url?: string
  qr_id?: string
  notes?: string
  created_at: string
}

const DICT = {
  en: {
    pageTitle: 'Courses, Workshops & Training',
    pageSub: 'Plan, manage and track research training activities.',
    languageBtn: 'العربية',
    liveData: 'Live data', demoData: 'Demo data — saved locally in this browser',
    addNew: 'Add new', export: 'Export',
    statTotal: 'Total activities', statScheduled: 'Scheduled',
    statInProgress: 'In progress', statCompleted: 'Completed',
    searchPh: 'Search by title, trainer, audience…',
    allTypes: 'All types', allStatus: 'All status', allDepts: 'All departments',
    typeWorkshop: 'Workshop', typeTraining: 'Training course',
    typeSeminar: 'Seminar', typeShort: 'Short course',
    statusScheduled: 'Scheduled', statusInProgress: 'In progress',
    statusCompleted: 'Completed', statusCancelled: 'Cancelled',
    colTitle: 'Title', colType: 'Type', colDate: 'Date',
    colTrainer: 'Trainer', colDept: 'Department', colAttendance: 'Attendance',
    colStatus: 'Status', colActions: 'Actions',
    deleteConfirm: 'Delete this activity?',
    deleted: 'Activity deleted.', saved: 'Activity saved.',
    none: 'No activities match your filters.', noneSub: 'Click "Add new" to schedule your first activity.',
    modalAdd: 'Add new activity',
    fldTitle: 'Title', fldTitleAr: 'Arabic title', fldType: 'Type',
    fldDate: 'Date', fldTime: 'Time', fldLocation: 'Location',
    fldTrainer: 'Trainer / speaker', fldAudience: 'Target audience',
    fldDept: 'Department', fldCapacity: 'Capacity',
    fldRegUrl: 'Registration URL', fldFormUrl: 'Google Form URL',
    fldNotes: 'Notes', save: 'Save', saving: 'Saving…', cancel: 'Cancel',
    requiredTitle: 'Title is required.', requiredDate: 'Date is required.',
  },
  ar: {
    pageTitle: 'الدورات وورش العمل والتدريب',
    pageSub: 'تخطيط وإدارة وتتبع الأنشطة التدريبية البحثية.',
    languageBtn: 'English',
    liveData: 'بيانات مباشرة', demoData: 'بيانات تجريبية — محفوظة محليًا',
    addNew: 'إضافة جديد', export: 'تصدير',
    statTotal: 'إجمالي الأنشطة', statScheduled: 'مجدولة',
    statInProgress: 'قيد التنفيذ', statCompleted: 'مكتملة',
    searchPh: 'ابحث بالعنوان أو المدرب أو الفئة المستهدفة…',
    allTypes: 'كل الأنواع', allStatus: 'كل الحالات', allDepts: 'كل الأقسام',
    typeWorkshop: 'ورشة عمل', typeTraining: 'دورة تدريبية',
    typeSeminar: 'حلقة نقاش', typeShort: 'دورة قصيرة',
    statusScheduled: 'مجدولة', statusInProgress: 'قيد التنفيذ',
    statusCompleted: 'مكتملة', statusCancelled: 'ملغاة',
    colTitle: 'العنوان', colType: 'النوع', colDate: 'التاريخ',
    colTrainer: 'المدرب', colDept: 'القسم', colAttendance: 'الحضور',
    colStatus: 'الحالة', colActions: 'إجراءات',
    deleteConfirm: 'هل ترغب بحذف هذا النشاط؟',
    deleted: 'تم حذف النشاط.', saved: 'تم حفظ النشاط.',
    none: 'لا توجد أنشطة تطابق فلاترك.', noneSub: 'اضغط "إضافة جديد" لجدولة أول نشاط.',
    modalAdd: 'إضافة نشاط جديد',
    fldTitle: 'العنوان', fldTitleAr: 'العنوان بالعربية', fldType: 'النوع',
    fldDate: 'التاريخ', fldTime: 'الوقت', fldLocation: 'المكان',
    fldTrainer: 'المدرب / المتحدث', fldAudience: 'الفئة المستهدفة',
    fldDept: 'القسم', fldCapacity: 'السعة',
    fldRegUrl: 'رابط التسجيل', fldFormUrl: 'رابط نموذج Google',
    fldNotes: 'ملاحظات', save: 'حفظ', saving: 'جاري الحفظ…', cancel: 'إلغاء',
    requiredTitle: 'العنوان مطلوب.', requiredDate: 'التاريخ مطلوب.',
  },
} as const

const STORAGE_KEY = 'pmnh-courses-v1'

const TYPE_LABEL: Record<CourseType, keyof typeof DICT.en> = {
  workshop: 'typeWorkshop', training: 'typeTraining',
  seminar: 'typeSeminar', short_course: 'typeShort',
}
const STATUS_COLOR: Record<CourseStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
}

function loadCourses(): Course[] {
  if (typeof window === 'undefined') return []
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw) } catch {/* ignore */}
  return seed()
}
function saveCourses(list: Course[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {/* ignore */}
}
function seed(): Course[] {
  const today = new Date()
  const plus = (d: number) => new Date(today.getTime() + d * 86400000).toISOString().slice(0, 10)
  return [
    {
      id: 'c1', title: 'Research Methodology Foundations', type: 'workshop',
      date: plus(7), time: '09:00', location: 'Auditorium A',
      trainer: 'Dr. Fatima Al-Zahrani', audience: 'New investigators',
      department_id: 'd14', participants_count: 22, capacity: 30,
      status: 'scheduled', google_form_url: 'https://forms.gle/pmnh-methodology',
      created_at: new Date().toISOString(),
    },
    {
      id: 'c2', title: 'IRB Application Writing', type: 'training',
      date: plus(-3), time: '10:00', location: 'Conference room 2',
      trainer: 'Sultan Alallah', audience: 'Research coordinators',
      department_id: 'd14', participants_count: 14, capacity: 20,
      status: 'completed', created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
    {
      id: 'c3', title: 'Statistics for Clinical Research', type: 'short_course',
      date: plus(0), time: '13:00', location: 'Skills lab',
      trainer: 'Afnan Bakri', audience: 'Nursing staff',
      department_id: 'd6', participants_count: 8, capacity: 25,
      status: 'in_progress', created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ]
}

export default function CoursesPage() {
  const { lang, isRtl, toggle, t } = useLang(DICT)
  const [items, setItems] = useState<Course[]>([])
  useEffect(() => { setItems(loadCourses()) }, [])
  useEffect(() => { if (items.length) saveCourses(items) }, [items])

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<CourseType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<CourseStatus | 'all'>('all')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = useMemo(() => items.filter(c => {
    if (search) {
      const q = search.toLowerCase()
      const hay = `${c.title} ${c.title_ar || ''} ${c.trainer} ${c.audience} ${c.location}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (typeFilter !== 'all' && c.type !== typeFilter) return false
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (deptFilter !== 'all' && c.department_id !== deptFilter) return false
    return true
  }), [items, search, typeFilter, statusFilter, deptFilter])

  const stats = useMemo(() => ({
    total: items.length,
    scheduled: items.filter(c => c.status === 'scheduled').length,
    inProgress: items.filter(c => c.status === 'in_progress').length,
    completed: items.filter(c => c.status === 'completed').length,
  }), [items])

  function handleSave(c: Course) {
    setItems(prev => [c, ...prev])
    setModalOpen(false)
    toast.success(t.saved)
  }
  function handleDelete(id: string) {
    if (!confirm(t.deleteConfirm)) return
    setItems(prev => prev.filter(c => c.id !== id))
    toast.success(t.deleted)
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5">

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            {t.pageTitle}
          </h1>
          <p className="page-subtitle">
            {t.pageSub}
            <span className="mx-2 text-gray-300" aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5 text-xs">
              <span className={cn('inline-block w-1.5 h-1.5 rounded-full', isDemoMode ? 'bg-amber-400' : 'bg-emerald-400')} aria-hidden />
              {isDemoMode ? t.demoData : t.liveData}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={toggle} className="btn-secondary text-sm">
            <Languages className="w-4 h-4" />
            {t.languageBtn}
          </button>
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            {t.addNew}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.statTotal,      value: stats.total,      color: 'blue',    icon: GraduationCap },
          { label: t.statScheduled,  value: stats.scheduled,  color: 'cyan',    icon: Calendar },
          { label: t.statInProgress, value: stats.inProgress, color: 'amber',   icon: Sparkles },
          { label: t.statCompleted,  value: stats.completed,  color: 'emerald', icon: CheckCircle },
        ].map(s => (
          <div key={s.label} className={cn(
            'premium-card p-4 flex items-center gap-3',
            s.color === 'blue'    && (isRtl ? 'border-r-4 border-r-blue-500'    : 'border-l-4 border-l-blue-500'),
            s.color === 'cyan'    && (isRtl ? 'border-r-4 border-r-cyan-500'    : 'border-l-4 border-l-cyan-500'),
            s.color === 'amber'   && (isRtl ? 'border-r-4 border-r-amber-500'   : 'border-l-4 border-l-amber-500'),
            s.color === 'emerald' && (isRtl ? 'border-r-4 border-r-emerald-500' : 'border-l-4 border-l-emerald-500'),
          )}>
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              s.color === 'blue'    && 'bg-blue-100 text-blue-600',
              s.color === 'cyan'    && 'bg-cyan-100 text-cyan-600',
              s.color === 'amber'   && 'bg-amber-100 text-amber-600',
              s.color === 'emerald' && 'bg-emerald-100 text-emerald-600',
            )}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="premium-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400', isRtl ? 'right-3' : 'left-3')} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t.searchPh}
            className={cn('form-input', isRtl ? 'pe-9' : 'ps-9')}
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as CourseType | 'all')} className="form-input w-auto min-w-[140px]">
          <option value="all">{t.allTypes}</option>
          {(Object.keys(TYPE_LABEL) as CourseType[]).map(k => (
            <option key={k} value={k}>{t[TYPE_LABEL[k]]}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as CourseStatus | 'all')} className="form-input w-auto min-w-[140px]">
          <option value="all">{t.allStatus}</option>
          <option value="scheduled">{t.statusScheduled}</option>
          <option value="in_progress">{t.statusInProgress}</option>
          <option value="completed">{t.statusCompleted}</option>
          <option value="cancelled">{t.statusCancelled}</option>
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="form-input w-auto min-w-[160px]">
          <option value="all">{t.allDepts}</option>
          {DEMO_DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.colTitle}</th>
                <th>{t.colType}</th>
                <th>{t.colDate}</th>
                <th>{t.colTrainer}</th>
                <th>{t.colDept}</th>
                <th>{t.colAttendance}</th>
                <th>{t.colStatus}</th>
                <th>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold text-gray-700">{t.none}</p>
                    <p className="text-xs mt-1">{t.noneSub}</p>
                  </td>
                </tr>
              ) : filtered.map(c => {
                const dept = c.department_id ? DEMO_DEPARTMENTS.find(d => d.id === c.department_id) : undefined
                return (
                  <tr key={c.id}>
                    <td>
                      <p className="font-semibold text-sm text-gray-900">{isRtl && c.title_ar ? c.title_ar : c.title}</p>
                      <p className="text-[11px] text-gray-500 inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {c.location}
                      </p>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {t[TYPE_LABEL[c.type]]}
                      </span>
                    </td>
                    <td className="text-xs">
                      <span className="text-gray-700">{formatDate(c.date)}</span>
                      <span className="text-gray-400 mx-1">·</span>
                      <span className="text-gray-500 font-mono">{c.time}</span>
                    </td>
                    <td className="text-xs text-gray-700 inline-flex items-center gap-1.5">
                      <UserIcon className="w-3 h-3 text-gray-400" />
                      {c.trainer}
                    </td>
                    <td>
                      {dept ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: dept.color }}>
                          <Building2 className="w-3 h-3" />
                          {dept.name}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="tabular-nums">{c.participants_count} / {c.capacity}</span>
                        <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden ms-1">
                          <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (c.participants_count / c.capacity) * 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={cn('badge text-[11px]', STATUS_COLOR[c.status])}>
                        {t[(`status${c.status.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('')}`) as keyof typeof t] || c.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {c.google_form_url && (
                          <a href={c.google_form_url} target="_blank" rel="noopener noreferrer"
                             className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                             title="Google Form">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Link href={`/qr-codes?activity=${c.id}`}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
                              title="QR">
                          <QrCode className="w-3.5 h-3.5" />
                        </Link>
                        <button type="button" onClick={() => handleDelete(c.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && <AddModal t={t} isRtl={isRtl} onClose={() => setModalOpen(false)} onSave={handleSave} />}
      </AnimatePresence>
    </div>
  )
}

function AddModal({
  t, isRtl, onClose, onSave,
}: {
  // Widened (non-literal) shape so the `useLang` return value can flow in
  // without the `as const` narrowing TS would otherwise apply.
  t: Record<keyof typeof DICT.en, string>
  isRtl: boolean
  onClose: () => void
  onSave: (c: Course) => void
}) {
  const [title, setTitle] = useState('')
  const [titleAr, setTitleAr] = useState('')
  const [type, setType] = useState<CourseType>('workshop')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [location, setLocation] = useState('')
  const [trainer, setTrainer] = useState('')
  const [audience, setAudience] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [capacity, setCapacity] = useState(30)
  const [regUrl, setRegUrl] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!title.trim()) { toast.error(t.requiredTitle); return }
    if (!date) { toast.error(t.requiredDate); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 250))
    onSave({
      id: `c-${Date.now().toString(36)}`,
      title: title.trim(),
      title_ar: titleAr.trim() || undefined,
      type, date, time, location: location.trim(),
      trainer: trainer.trim(), audience: audience.trim(),
      department_id: departmentId || undefined,
      participants_count: 0, capacity,
      status: 'scheduled',
      registration_url: regUrl.trim() || undefined,
      google_form_url: formUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      created_at: new Date().toISOString(),
    })
    setSaving(false)
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={onClose} className="fixed inset-0 bg-black/50 z-40" aria-hidden />
      <motion.div role="dialog" aria-modal="true"
                  initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }}
                  transition={{ duration: 0.2 }} dir={isRtl ? 'rtl' : 'ltr'}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="font-bold text-gray-900 text-lg inline-flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              {t.modalAdd}
            </h2>
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.fldTitle} required>
                <input value={title} onChange={e => setTitle(e.target.value)} className="form-input" autoFocus />
              </Field>
              <Field label={t.fldTitleAr}>
                <input value={titleAr} onChange={e => setTitleAr(e.target.value)} dir="rtl" className="form-input" />
              </Field>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label={t.fldType}>
                <select value={type} onChange={e => setType(e.target.value as CourseType)} className="form-input">
                  {(Object.keys(TYPE_LABEL) as CourseType[]).map(k => (
                    <option key={k} value={k}>{t[TYPE_LABEL[k]]}</option>
                  ))}
                </select>
              </Field>
              <Field label={t.fldDate} required>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" />
              </Field>
              <Field label={t.fldTime}>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} className="form-input" />
              </Field>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.fldLocation}>
                <input value={location} onChange={e => setLocation(e.target.value)} className="form-input" />
              </Field>
              <Field label={t.fldTrainer}>
                <input value={trainer} onChange={e => setTrainer(e.target.value)} className="form-input" />
              </Field>
              <Field label={t.fldAudience}>
                <input value={audience} onChange={e => setAudience(e.target.value)} className="form-input" />
              </Field>
              <Field label={t.fldDept}>
                <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="form-input">
                  <option value="">—</option>
                  {DEMO_DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label={t.fldCapacity}>
                <input type="number" min={1} value={capacity} onChange={e => setCapacity(Number(e.target.value))} className="form-input" />
              </Field>
              <Field label={t.fldRegUrl}>
                <input type="url" value={regUrl} onChange={e => setRegUrl(e.target.value)} placeholder="https://…" className="form-input" dir="ltr" />
              </Field>
            </div>
            <Field label={t.fldFormUrl}>
              <input type="url" value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="https://forms.gle/…" className="form-input" dir="ltr" />
            </Field>
            <Field label={t.fldNotes}>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="form-input" />
            </Field>
          </div>
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">{t.cancel}</button>
            <button type="button" onClick={handleSubmit} disabled={saving} className="btn-primary text-sm">
              {saving ? <Sparkles className="w-4 h-4 animate-pulse" /> : <Plus className="w-4 h-4" />}
              {saving ? t.saving : t.save}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">{label}{required && <span className="text-red-500 ms-1">*</span>}</label>
      {children}
    </div>
  )
}
