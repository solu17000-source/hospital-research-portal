'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Award, Building2, Calendar, FileText, Globe, Languages, MapPin, Mic, Plus,
  Presentation, Search, Sparkles, Trash2, X,
} from 'lucide-react'

import { DEMO_DEPARTMENTS } from '@/lib/demo-data'
import { useLang } from '@/lib/i18n'
import { cn, formatDate } from '@/lib/utils'

type ConferenceType = 'local' | 'international'
type ParticipationType = 'oral' | 'poster' | 'abstract' | 'published_paper'
type ConferenceStatus = 'submitted' | 'accepted' | 'presented' | 'rejected'

type Conference = {
  id: string
  paper_title: string
  presenter: string
  co_authors?: string
  conference_name: string
  conference_type: ConferenceType
  participation_type: ParticipationType
  country: string
  city: string
  date: string
  department_id?: string
  status: ConferenceStatus
  notes?: string
  created_at: string
}

const DICT = {
  en: {
    pageTitle: 'Conferences & Scientific Participation',
    pageSub: 'Track local and international conference presentations, posters and abstracts.',
    languageBtn: 'العربية', liveData: 'Live data', demoData: 'Demo data — saved locally',
    addNew: 'New participation', searchPh: 'Search by paper, presenter, conference…',
    statTotal: 'Total entries', statInternational: 'International',
    statLocal: 'Local', statPresented: 'Presented',
    allDepts: 'All departments', allTypes: 'All types', allParticipation: 'All forms',
    typeLocal: 'Local', typeInternational: 'International',
    partOral: 'Oral presentation', partPoster: 'Poster', partAbstract: 'Abstract', partPaper: 'Published paper',
    statusSubmitted: 'Submitted', statusAccepted: 'Accepted', statusPresented: 'Presented', statusRejected: 'Rejected',
    colPaper: 'Paper', colPresenter: 'Presenter', colConference: 'Conference',
    colLocation: 'Location', colDate: 'Date', colType: 'Type', colDept: 'Department',
    colStatus: 'Status', colActions: 'Actions',
    deleteConfirm: 'Delete this entry?', deleted: 'Entry deleted.', saved: 'Entry saved.',
    none: 'No entries match these filters.', noneSub: 'Add the first conference participation.',
    modalAdd: 'New conference participation',
    fldPaper: 'Paper title', fldPresenter: 'Presenter', fldCoAuthors: 'Co-authors',
    fldConference: 'Conference name', fldType: 'Conference type', fldPart: 'Participation form',
    fldCountry: 'Country', fldCity: 'City', fldDate: 'Date', fldDept: 'Department',
    fldStatus: 'Status', fldNotes: 'Notes',
    save: 'Save', saving: 'Saving…', cancel: 'Cancel',
    requiredPaper: 'Paper title is required.', requiredConference: 'Conference name is required.',
  },
  ar: {
    pageTitle: 'المؤتمرات والمشاركات العلمية',
    pageSub: 'تتبع العروض الشفوية والملصقات والملخصات المحلية والدولية.',
    languageBtn: 'English', liveData: 'بيانات مباشرة', demoData: 'بيانات تجريبية — محفوظة محليًا',
    addNew: 'مشاركة جديدة', searchPh: 'ابحث بعنوان الورقة أو المتحدث أو المؤتمر…',
    statTotal: 'إجمالي المشاركات', statInternational: 'دولية',
    statLocal: 'محلية', statPresented: 'تم تقديمها',
    allDepts: 'كل الأقسام', allTypes: 'كل الأنواع', allParticipation: 'كل أشكال المشاركة',
    typeLocal: 'محلي', typeInternational: 'دولي',
    partOral: 'عرض شفوي', partPoster: 'ملصق', partAbstract: 'ملخص', partPaper: 'بحث منشور',
    statusSubmitted: 'مقدم', statusAccepted: 'مقبول', statusPresented: 'قُدم', statusRejected: 'مرفوض',
    colPaper: 'البحث', colPresenter: 'المتحدث', colConference: 'المؤتمر',
    colLocation: 'الموقع', colDate: 'التاريخ', colType: 'النوع', colDept: 'القسم',
    colStatus: 'الحالة', colActions: 'إجراءات',
    deleteConfirm: 'هل ترغب بحذف هذه المشاركة؟', deleted: 'تم الحذف.', saved: 'تم الحفظ.',
    none: 'لا توجد مشاركات تطابق الفلاتر.', noneSub: 'أضف أول مشاركة مؤتمرية.',
    modalAdd: 'مشاركة مؤتمر جديدة',
    fldPaper: 'عنوان البحث', fldPresenter: 'المتحدث', fldCoAuthors: 'المشاركون',
    fldConference: 'اسم المؤتمر', fldType: 'نوع المؤتمر', fldPart: 'شكل المشاركة',
    fldCountry: 'الدولة', fldCity: 'المدينة', fldDate: 'التاريخ', fldDept: 'القسم',
    fldStatus: 'الحالة', fldNotes: 'ملاحظات',
    save: 'حفظ', saving: 'جاري الحفظ…', cancel: 'إلغاء',
    requiredPaper: 'عنوان البحث مطلوب.', requiredConference: 'اسم المؤتمر مطلوب.',
  },
} as const

const STORAGE_KEY = 'pmnh-conferences-v1'

const PART_LABEL: Record<ParticipationType, keyof typeof DICT.en> = {
  oral: 'partOral', poster: 'partPoster', abstract: 'partAbstract', published_paper: 'partPaper',
}
const STATUS_LABEL: Record<ConferenceStatus, keyof typeof DICT.en> = {
  submitted: 'statusSubmitted', accepted: 'statusAccepted', presented: 'statusPresented', rejected: 'statusRejected',
}
const STATUS_COLOR: Record<ConferenceStatus, string> = {
  submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  accepted: 'bg-amber-100 text-amber-700 border-amber-200',
  presented: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
}

function load(): Conference[] {
  if (typeof window === 'undefined') return []
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw) } catch {/* ignore */}
  return seed()
}
function save(list: Conference[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {/* ignore */}
}
function seed(): Conference[] {
  return [
    { id: 'cf1', paper_title: 'Hypertension Management Protocols in ICU Settings', presenter: 'Dr. Ahmed Al-Qahtani', conference_name: 'Saudi Society of Internal Medicine Annual Meeting', conference_type: 'local', participation_type: 'oral', country: 'Saudi Arabia', city: 'Riyadh', date: '2025-11-12', department_id: 'd5', status: 'presented', created_at: new Date(Date.now() - 90 * 86400000).toISOString() },
    { id: 'cf2', paper_title: 'Nursing Staff Burnout — A Regional Survey', presenter: 'Afnan Bakri', co_authors: 'Sara Al-Malki, Layla Al-Ghamdi', conference_name: 'International Council of Nurses Congress', conference_type: 'international', participation_type: 'poster', country: 'Switzerland', city: 'Geneva', date: '2026-06-22', department_id: 'd6', status: 'accepted', created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: 'cf3', paper_title: 'AI-Assisted Radiology Diagnosis', presenter: 'Dr. Ibrahim Al-Dosari', conference_name: 'European Congress of Radiology', conference_type: 'international', participation_type: 'abstract', country: 'Austria', city: 'Vienna', date: '2026-03-04', department_id: 'd9', status: 'submitted', created_at: new Date(Date.now() - 14 * 86400000).toISOString() },
  ]
}

export default function ConferencesPage() {
  const { isRtl, toggle, t } = useLang(DICT)
  const [items, setItems] = useState<Conference[]>([])
  useEffect(() => { setItems(load()) }, [])
  useEffect(() => { if (items.length) save(items) }, [items])

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<ConferenceType | 'all'>('all')
  const [partFilter, setPartFilter] = useState<ParticipationType | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = useMemo(() => items.filter(c => {
    if (search) {
      const q = search.toLowerCase()
      const hay = `${c.paper_title} ${c.presenter} ${c.co_authors || ''} ${c.conference_name} ${c.city} ${c.country}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (deptFilter !== 'all' && c.department_id !== deptFilter) return false
    if (typeFilter !== 'all' && c.conference_type !== typeFilter) return false
    if (partFilter !== 'all' && c.participation_type !== partFilter) return false
    return true
  }), [items, search, deptFilter, typeFilter, partFilter])

  const stats = useMemo(() => ({
    total: items.length,
    international: items.filter(c => c.conference_type === 'international').length,
    local: items.filter(c => c.conference_type === 'local').length,
    presented: items.filter(c => c.status === 'presented').length,
  }), [items])

  function handleSave(c: Conference) {
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
            <Presentation className="w-6 h-6 text-blue-600" />
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
          { label: t.statTotal,         value: stats.total,         color: 'blue',    icon: Presentation },
          { label: t.statInternational, value: stats.international, color: 'violet',  icon: Globe },
          { label: t.statLocal,         value: stats.local,         color: 'cyan',    icon: MapPin },
          { label: t.statPresented,     value: stats.presented,     color: 'emerald', icon: Award },
        ].map(s => (
          <div key={s.label} className={cn(
            'premium-card p-4 flex items-center gap-3',
            s.color === 'blue'    && (isRtl ? 'border-r-4 border-r-blue-500'    : 'border-l-4 border-l-blue-500'),
            s.color === 'violet'  && (isRtl ? 'border-r-4 border-r-violet-500'  : 'border-l-4 border-l-violet-500'),
            s.color === 'cyan'    && (isRtl ? 'border-r-4 border-r-cyan-500'    : 'border-l-4 border-l-cyan-500'),
            s.color === 'emerald' && (isRtl ? 'border-r-4 border-r-emerald-500' : 'border-l-4 border-l-emerald-500'),
          )}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
              s.color === 'blue'    && 'bg-blue-100 text-blue-600',
              s.color === 'violet'  && 'bg-violet-100 text-violet-600',
              s.color === 'cyan'    && 'bg-cyan-100 text-cyan-600',
              s.color === 'emerald' && 'bg-emerald-100 text-emerald-600',
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
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as ConferenceType | 'all')} className="form-input w-auto min-w-[140px]">
          <option value="all">{t.allTypes}</option>
          <option value="local">{t.typeLocal}</option>
          <option value="international">{t.typeInternational}</option>
        </select>
        <select value={partFilter} onChange={e => setPartFilter(e.target.value as ParticipationType | 'all')} className="form-input w-auto min-w-[160px]">
          <option value="all">{t.allParticipation}</option>
          {(Object.keys(PART_LABEL) as ParticipationType[]).map(k => <option key={k} value={k}>{t[PART_LABEL[k]]}</option>)}
        </select>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.colPaper}</th><th>{t.colPresenter}</th><th>{t.colConference}</th>
                <th>{t.colLocation}</th><th>{t.colDate}</th><th>{t.colType}</th>
                <th>{t.colDept}</th><th>{t.colStatus}</th><th>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16 text-gray-400">
                  <Presentation className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold text-gray-700">{t.none}</p>
                  <p className="text-xs mt-1">{t.noneSub}</p>
                </td></tr>
              ) : filtered.map(c => {
                const dept = c.department_id ? DEMO_DEPARTMENTS.find(d => d.id === c.department_id) : undefined
                return (
                  <tr key={c.id}>
                    <td>
                      <p className="text-xs font-semibold text-gray-900 max-w-[260px] line-clamp-2">{c.paper_title}</p>
                      <p className="text-[11px] text-blue-700 mt-0.5">{t[PART_LABEL[c.participation_type]]}</p>
                    </td>
                    <td>
                      <p className="text-xs text-gray-700 inline-flex items-center gap-1.5"><Mic className="w-3 h-3 text-gray-400" />{c.presenter}</p>
                      {c.co_authors && <p className="text-[10px] text-gray-400 mt-0.5">+ {c.co_authors}</p>}
                    </td>
                    <td><span className="text-xs text-gray-700">{c.conference_name}</span></td>
                    <td className="text-xs text-gray-600 inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />{c.city}, {c.country}
                    </td>
                    <td><span className="text-xs text-gray-500">{formatDate(c.date)}</span></td>
                    <td>
                      <span className={cn('badge text-[11px]',
                        c.conference_type === 'international'
                          ? 'bg-violet-100 text-violet-700 border-violet-200'
                          : 'bg-cyan-100 text-cyan-700 border-cyan-200',
                      )}>
                        {c.conference_type === 'international' ? t.typeInternational : t.typeLocal}
                      </span>
                    </td>
                    <td>
                      {dept ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: dept.color }}>
                          <Building2 className="w-3 h-3" />{dept.name}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td><span className={cn('badge text-[11px]', STATUS_COLOR[c.status])}>{t[STATUS_LABEL[c.status]]}</span></td>
                    <td>
                      <button type="button" onClick={() => handleDelete(c.id)}
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
  onSave: (c: Conference) => void
}) {
  const [paperTitle, setPaperTitle] = useState('')
  const [presenter, setPresenter] = useState('')
  const [coAuthors, setCoAuthors] = useState('')
  const [conferenceName, setConferenceName] = useState('')
  const [conferenceType, setConferenceType] = useState<ConferenceType>('local')
  const [participationType, setParticipationType] = useState<ParticipationType>('oral')
  const [country, setCountry] = useState('Saudi Arabia')
  const [city, setCity] = useState('')
  const [date, setDate] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [status, setStatus] = useState<ConferenceStatus>('submitted')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!paperTitle.trim()) { toast.error(t.requiredPaper); return }
    if (!conferenceName.trim()) { toast.error(t.requiredConference); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 200))
    onSave({
      id: `cf-${Date.now().toString(36)}`,
      paper_title: paperTitle.trim(),
      presenter: presenter.trim(),
      co_authors: coAuthors.trim() || undefined,
      conference_name: conferenceName.trim(),
      conference_type: conferenceType,
      participation_type: participationType,
      country: country.trim(), city: city.trim(), date,
      department_id: departmentId || undefined,
      status, notes: notes.trim() || undefined,
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="font-bold text-gray-900 text-lg inline-flex items-center gap-2">
              <Presentation className="w-5 h-5 text-blue-600" />{t.modalAdd}
            </h2>
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 py-5 space-y-4">
            <Field label={t.fldPaper} required>
              <input value={paperTitle} onChange={e => setPaperTitle(e.target.value)} className="form-input" autoFocus />
            </Field>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.fldPresenter}>
                <input value={presenter} onChange={e => setPresenter(e.target.value)} className="form-input" />
              </Field>
              <Field label={t.fldCoAuthors}>
                <input value={coAuthors} onChange={e => setCoAuthors(e.target.value)} className="form-input" />
              </Field>
            </div>
            <Field label={t.fldConference} required>
              <input value={conferenceName} onChange={e => setConferenceName(e.target.value)} className="form-input" />
            </Field>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.fldType}>
                <select value={conferenceType} onChange={e => setConferenceType(e.target.value as ConferenceType)} className="form-input">
                  <option value="local">{t.typeLocal}</option>
                  <option value="international">{t.typeInternational}</option>
                </select>
              </Field>
              <Field label={t.fldPart}>
                <select value={participationType} onChange={e => setParticipationType(e.target.value as ParticipationType)} className="form-input">
                  {(Object.keys(PART_LABEL) as ParticipationType[]).map(k => <option key={k} value={k}>{t[PART_LABEL[k]]}</option>)}
                </select>
              </Field>
              <Field label={t.fldCountry}>
                <input value={country} onChange={e => setCountry(e.target.value)} className="form-input" />
              </Field>
              <Field label={t.fldCity}>
                <input value={city} onChange={e => setCity(e.target.value)} className="form-input" />
              </Field>
              <Field label={t.fldDate}>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" />
              </Field>
              <Field label={t.fldDept}>
                <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="form-input">
                  <option value="">—</option>
                  {DEMO_DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label={t.fldStatus}>
                <select value={status} onChange={e => setStatus(e.target.value as ConferenceStatus)} className="form-input">
                  {(Object.keys(STATUS_LABEL) as ConferenceStatus[]).map(k => <option key={k} value={k}>{t[STATUS_LABEL[k]]}</option>)}
                </select>
              </Field>
            </div>
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
