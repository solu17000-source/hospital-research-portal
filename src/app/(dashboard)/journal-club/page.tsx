'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  BookMarked, Building2, Calendar, FileText, Languages, Mic, Plus, Search,
  Sparkles, Trash2, Users, X,
} from 'lucide-react'

import { DEMO_DEPARTMENTS } from '@/lib/demo-data'
import { useLang } from '@/lib/i18n'
import { cn, formatDate } from '@/lib/utils'

type SessionStatus = 'scheduled' | 'completed' | 'cancelled'

type JournalSession = {
  id: string
  title: string
  article_title: string
  presenter: string
  date: string
  time: string
  department_id?: string
  attendance_count: number
  status: SessionStatus
  discussion?: string
  recommendations?: string
  google_form_url?: string
  created_at: string
}

const DICT = {
  en: {
    pageTitle: 'Research Journal Club',
    pageSub: 'Monthly sessions reviewing recent literature and methodology critiques.',
    languageBtn: 'العربية', liveData: 'Live data', demoData: 'Demo data — saved locally',
    addNew: 'New session', searchPh: 'Search by title, article, presenter…',
    statTotal: 'Total sessions', statScheduled: 'Upcoming',
    statCompleted: 'Completed', statAttendance: 'Average attendance',
    allDepts: 'All departments', allStatus: 'All status',
    statusScheduled: 'Scheduled', statusCompleted: 'Completed', statusCancelled: 'Cancelled',
    colTitle: 'Session', colArticle: 'Article', colPresenter: 'Presenter',
    colDate: 'Date', colDept: 'Department', colAttendance: 'Attendance', colStatus: 'Status', colActions: 'Actions',
    deleteConfirm: 'Delete this session?', deleted: 'Session deleted.', saved: 'Session saved.',
    none: 'No sessions match these filters.', noneSub: 'Schedule the next Journal Club here.',
    modalAdd: 'New Journal Club session',
    fldTitle: 'Session title', fldArticle: 'Article title', fldPresenter: 'Presenter',
    fldDate: 'Date', fldTime: 'Time', fldDept: 'Department', fldFormUrl: 'Google Form URL',
    fldDiscussion: 'Discussion summary', fldRecommendations: 'Recommendations',
    save: 'Save', saving: 'Saving…', cancel: 'Cancel',
    requiredTitle: 'Session title is required.', requiredArticle: 'Article title is required.',
  },
  ar: {
    pageTitle: 'النادي البحثي',
    pageSub: 'جلسات شهرية لمراجعة الأدبيات الحديثة ونقد المنهجية.',
    languageBtn: 'English', liveData: 'بيانات مباشرة', demoData: 'بيانات تجريبية — محفوظة محليًا',
    addNew: 'جلسة جديدة', searchPh: 'ابحث بالعنوان أو المقال أو المتحدث…',
    statTotal: 'إجمالي الجلسات', statScheduled: 'قادمة',
    statCompleted: 'مكتملة', statAttendance: 'متوسط الحضور',
    allDepts: 'كل الأقسام', allStatus: 'كل الحالات',
    statusScheduled: 'مجدولة', statusCompleted: 'مكتملة', statusCancelled: 'ملغاة',
    colTitle: 'الجلسة', colArticle: 'المقال', colPresenter: 'المتحدث',
    colDate: 'التاريخ', colDept: 'القسم', colAttendance: 'الحضور', colStatus: 'الحالة', colActions: 'إجراءات',
    deleteConfirm: 'هل ترغب بحذف الجلسة؟', deleted: 'تم الحذف.', saved: 'تم حفظ الجلسة.',
    none: 'لا توجد جلسات تطابق الفلاتر.', noneSub: 'جدول الجلسة القادمة هنا.',
    modalAdd: 'جلسة نادي بحثي جديدة',
    fldTitle: 'عنوان الجلسة', fldArticle: 'عنوان المقال', fldPresenter: 'المتحدث',
    fldDate: 'التاريخ', fldTime: 'الوقت', fldDept: 'القسم', fldFormUrl: 'رابط نموذج Google',
    fldDiscussion: 'ملخص النقاش', fldRecommendations: 'التوصيات',
    save: 'حفظ', saving: 'جاري الحفظ…', cancel: 'إلغاء',
    requiredTitle: 'عنوان الجلسة مطلوب.', requiredArticle: 'عنوان المقال مطلوب.',
  },
} as const

const STORAGE_KEY = 'pmnh-journal-club-v1'

const STATUS_LABEL: Record<SessionStatus, keyof typeof DICT.en> = {
  scheduled: 'statusScheduled', completed: 'statusCompleted', cancelled: 'statusCancelled',
}
const STATUS_COLOR: Record<SessionStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
}

function load(): JournalSession[] {
  if (typeof window === 'undefined') return []
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw) } catch {/* ignore */}
  return seed()
}
function save(list: JournalSession[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {/* ignore */}
}
function seed(): JournalSession[] {
  const today = new Date()
  const at = (d: number) => new Date(today.getTime() + d * 86400000).toISOString().slice(0, 10)
  return [
    { id: 'jc1', title: 'May Session', article_title: 'Evidence-based nursing handoff practices in critical care', presenter: 'Afnan Bakri',          date: at(0),  time: '14:00', department_id: 'd6',  attendance_count: 18, status: 'completed', discussion: 'Strong evidence for structured SBAR handoffs.', created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: 'jc2', title: 'April Session', article_title: 'Hypertension management in ICU patients — meta-analysis', presenter: 'Dr. Ahmed Al-Qahtani',  date: at(-30), time: '14:00', department_id: 'd5',  attendance_count: 22, status: 'completed', discussion: 'Recommended adoption of tighter BP target ranges.', created_at: new Date(Date.now() - 60 * 86400000).toISOString() },
    { id: 'jc3', title: 'June Session', article_title: 'AI-assisted radiology diagnosis — systematic review',     presenter: 'Dr. Ibrahim Al-Dosari', date: at(28), time: '14:00', department_id: 'd9',  attendance_count: 0,  status: 'scheduled', created_at: new Date().toISOString() },
  ]
}

export default function JournalClubPage() {
  const { isRtl, toggle, t } = useLang(DICT)
  const [items, setItems] = useState<JournalSession[]>([])
  useEffect(() => { setItems(load()) }, [])
  useEffect(() => { if (items.length) save(items) }, [items])

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = useMemo(() => items.filter(s => {
    if (search) {
      const q = search.toLowerCase()
      const hay = `${s.title} ${s.article_title} ${s.presenter}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (deptFilter !== 'all' && s.department_id !== deptFilter) return false
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    return true
  }), [items, search, deptFilter, statusFilter])

  const stats = useMemo(() => {
    const completed = items.filter(s => s.status === 'completed')
    const avgAttendance = completed.length
      ? Math.round(completed.reduce((acc, s) => acc + s.attendance_count, 0) / completed.length)
      : 0
    return {
      total: items.length,
      scheduled: items.filter(s => s.status === 'scheduled').length,
      completed: completed.length,
      avgAttendance,
    }
  }, [items])

  function handleSave(s: JournalSession) {
    setItems(prev => [s, ...prev])
    setModalOpen(false)
    toast.success(t.saved)
  }
  function handleDelete(id: string) {
    if (!confirm(t.deleteConfirm)) return
    setItems(prev => prev.filter(s => s.id !== id))
    toast.success(t.deleted)
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5">

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-blue-600" />
            {t.pageTitle}
          </h1>
          <p className="page-subtitle">
            {t.pageSub}
            <span className="mx-2 text-gray-300" aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5 text-xs">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden />
              {t.liveData}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={toggle} className="btn-secondary text-sm">
            <Languages className="w-4 h-4" />{t.languageBtn}
          </button>
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />{t.addNew}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.statTotal,      value: stats.total,         color: 'blue',    icon: BookMarked },
          { label: t.statScheduled,  value: stats.scheduled,     color: 'cyan',    icon: Calendar },
          { label: t.statCompleted,  value: stats.completed,     color: 'emerald', icon: FileText },
          { label: t.statAttendance, value: stats.avgAttendance, color: 'violet',  icon: Users },
        ].map(s => (
          <div key={s.label} className={cn(
            'premium-card p-4 flex items-center gap-3',
            s.color === 'blue'    && (isRtl ? 'border-r-4 border-r-blue-500'    : 'border-l-4 border-l-blue-500'),
            s.color === 'cyan'    && (isRtl ? 'border-r-4 border-r-cyan-500'    : 'border-l-4 border-l-cyan-500'),
            s.color === 'emerald' && (isRtl ? 'border-r-4 border-r-emerald-500' : 'border-l-4 border-l-emerald-500'),
            s.color === 'violet'  && (isRtl ? 'border-r-4 border-r-violet-500'  : 'border-l-4 border-l-violet-500'),
          )}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
              s.color === 'blue'    && 'bg-blue-100 text-blue-600',
              s.color === 'cyan'    && 'bg-cyan-100 text-cyan-600',
              s.color === 'emerald' && 'bg-emerald-100 text-emerald-600',
              s.color === 'violet'  && 'bg-violet-100 text-violet-600',
            )}><s.icon className="w-5 h-5" /></div>
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchPh}
                 className={cn('form-input', isRtl ? 'pe-9' : 'ps-9')} />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="form-input w-auto min-w-[160px]">
          <option value="all">{t.allDepts}</option>
          {DEMO_DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as SessionStatus | 'all')} className="form-input w-auto min-w-[140px]">
          <option value="all">{t.allStatus}</option>
          {(Object.keys(STATUS_LABEL) as SessionStatus[]).map(k => <option key={k} value={k}>{t[STATUS_LABEL[k]]}</option>)}
        </select>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.colTitle}</th><th>{t.colArticle}</th><th>{t.colPresenter}</th>
                <th>{t.colDate}</th><th>{t.colDept}</th><th>{t.colAttendance}</th>
                <th>{t.colStatus}</th><th>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                  <BookMarked className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold text-gray-700">{t.none}</p>
                  <p className="text-xs mt-1">{t.noneSub}</p>
                </td></tr>
              ) : filtered.map(s => {
                const dept = s.department_id ? DEMO_DEPARTMENTS.find(d => d.id === s.department_id) : undefined
                return (
                  <tr key={s.id}>
                    <td><span className="font-semibold text-sm text-gray-900">{s.title}</span></td>
                    <td><p className="text-xs text-gray-700 max-w-[260px] line-clamp-2">{s.article_title}</p></td>
                    <td className="text-xs text-gray-700 inline-flex items-center gap-1.5">
                      <Mic className="w-3 h-3 text-gray-400" />{s.presenter}
                    </td>
                    <td className="text-xs">
                      <span className="text-gray-700">{formatDate(s.date)}</span>
                      <span className="text-gray-400 mx-1">·</span>
                      <span className="text-gray-500 font-mono">{s.time}</span>
                    </td>
                    <td>
                      {dept ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: dept.color }}>
                          <Building2 className="w-3 h-3" />{dept.name}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td><span className="text-xs tabular-nums text-gray-700">{s.attendance_count}</span></td>
                    <td><span className={cn('badge text-[11px]', STATUS_COLOR[s.status])}>{t[STATUS_LABEL[s.status]]}</span></td>
                    <td>
                      <button type="button" onClick={() => handleDelete(s.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
  t: Record<keyof typeof DICT.en, string>
  isRtl: boolean
  onClose: () => void
  onSave: (s: JournalSession) => void
}) {
  const [title, setTitle] = useState('')
  const [articleTitle, setArticleTitle] = useState('')
  const [presenter, setPresenter] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('14:00')
  const [departmentId, setDepartmentId] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [discussion, setDiscussion] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!title.trim()) { toast.error(t.requiredTitle); return }
    if (!articleTitle.trim()) { toast.error(t.requiredArticle); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 200))
    onSave({
      id: `jc-${Date.now().toString(36)}`,
      title: title.trim(), article_title: articleTitle.trim(),
      presenter: presenter.trim(), date, time,
      department_id: departmentId || undefined,
      attendance_count: 0, status: 'scheduled',
      discussion: discussion.trim() || undefined,
      recommendations: recommendations.trim() || undefined,
      google_form_url: formUrl.trim() || undefined,
      created_at: new Date().toISOString(),
    })
    setSaving(false)
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={onClose} className="fixed inset-0 bg-black/50 z-40" aria-hidden />
      <motion.div role="dialog" aria-modal="true"
                  initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }} dir={isRtl ? 'rtl' : 'ltr'}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="font-bold text-gray-900 text-lg inline-flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-blue-600" />{t.modalAdd}
            </h2>
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 py-5 space-y-4">
            <Field label={t.fldTitle} required>
              <input value={title} onChange={e => setTitle(e.target.value)} className="form-input" autoFocus />
            </Field>
            <Field label={t.fldArticle} required>
              <input value={articleTitle} onChange={e => setArticleTitle(e.target.value)} className="form-input" />
            </Field>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.fldPresenter}>
                <input value={presenter} onChange={e => setPresenter(e.target.value)} className="form-input" />
              </Field>
              <Field label={t.fldDept}>
                <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="form-input">
                  <option value="">—</option>
                  {DEMO_DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label={t.fldDate}>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" />
              </Field>
              <Field label={t.fldTime}>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} className="form-input" />
              </Field>
            </div>
            <Field label={t.fldFormUrl}>
              <input type="url" value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="https://forms.gle/…" className="form-input" dir="ltr" />
            </Field>
            <Field label={t.fldDiscussion}>
              <textarea value={discussion} onChange={e => setDiscussion(e.target.value)} rows={2} className="form-input" />
            </Field>
            <Field label={t.fldRecommendations}>
              <textarea value={recommendations} onChange={e => setRecommendations(e.target.value)} rows={2} className="form-input" />
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
