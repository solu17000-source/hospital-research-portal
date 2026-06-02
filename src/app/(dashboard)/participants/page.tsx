'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Award, BadgeCheck, Building2, CheckCircle, FileSpreadsheet, Languages, Mail,
  Phone, Plus, Search, Sparkles, Trash2, UserRound, X,
} from 'lucide-react'

import { DEMO_DEPARTMENTS } from '@/lib/demo-data'
import { useLang } from '@/lib/i18n'
import { cn, formatDate } from '@/lib/utils'

type AttendanceStatus = 'registered' | 'attended' | 'absent' | 'cancelled'
type CertificateStatus = 'not_issued' | 'pending' | 'issued'

type Participant = {
  id: string
  full_name: string
  email: string
  phone?: string
  employee_id?: string
  department_id?: string
  activity: string
  registered_at: string
  attendance: AttendanceStatus
  certificate: CertificateStatus
  source?: string
  notes?: string
}

const DICT = {
  en: {
    pageTitle: 'Participants', pageSub: 'Track participants registered or attending research activities.',
    languageBtn: 'العربية', liveData: 'Live data', demoData: 'Demo data — saved locally',
    addNew: 'Add participant', export: 'Export', searchPh: 'Search by name, email, employee ID…',
    statTotal: 'Total participants', statAttended: 'Attended',
    statAbsent: 'Absent', statCert: 'Certificates issued',
    allDepts: 'All departments', allAttendance: 'All attendance', allCert: 'All certificates',
    attRegistered: 'Registered', attAttended: 'Attended', attAbsent: 'Absent', attCancelled: 'Cancelled',
    certNotIssued: 'Not issued', certPending: 'Pending', certIssued: 'Issued',
    colName: 'Name', colContact: 'Contact', colEmployee: 'Employee ID', colDept: 'Department',
    colActivity: 'Activity', colReg: 'Registered', colAttendance: 'Attendance', colCert: 'Certificate', colActions: 'Actions',
    deleteConfirm: 'Delete this participant?', deleted: 'Participant deleted.', saved: 'Participant added.',
    none: 'No participants match these filters.', noneSub: 'Add a participant manually or sync from a Google Sheet via QR.',
    modalAdd: 'Add participant',
    fldName: 'Full name', fldEmail: 'Email', fldPhone: 'Mobile', fldEmployee: 'Employee ID',
    fldDept: 'Department', fldActivity: 'Activity', fldAttendance: 'Attendance', fldCert: 'Certificate status',
    fldNotes: 'Notes', save: 'Save', saving: 'Saving…', cancel: 'Cancel',
    requiredName: 'Name is required.', requiredEmail: 'Email is required.',
  },
  ar: {
    pageTitle: 'المشاركون', pageSub: 'تتبع المشاركين المسجلين أو الحاضرين للأنشطة البحثية.',
    languageBtn: 'English', liveData: 'بيانات مباشرة', demoData: 'بيانات تجريبية — محفوظة محليًا',
    addNew: 'إضافة مشارك', export: 'تصدير', searchPh: 'ابحث بالاسم أو البريد أو الرقم الوظيفي…',
    statTotal: 'إجمالي المشاركين', statAttended: 'حضروا',
    statAbsent: 'غائبون', statCert: 'شهادات صادرة',
    allDepts: 'كل الأقسام', allAttendance: 'كل حالات الحضور', allCert: 'كل حالات الشهادات',
    attRegistered: 'مسجل', attAttended: 'حضر', attAbsent: 'غائب', attCancelled: 'ملغي',
    certNotIssued: 'لم تصدر', certPending: 'بانتظار', certIssued: 'صادرة',
    colName: 'الاسم', colContact: 'بيانات التواصل', colEmployee: 'الرقم الوظيفي', colDept: 'القسم',
    colActivity: 'النشاط', colReg: 'تاريخ التسجيل', colAttendance: 'الحضور', colCert: 'الشهادة', colActions: 'إجراءات',
    deleteConfirm: 'هل ترغب بحذف هذا المشارك؟', deleted: 'تم الحذف.', saved: 'تمت إضافة المشارك.',
    none: 'لا يوجد مشاركون يطابقون الفلاتر.', noneSub: 'أضف يدويًا أو زامن من Google Sheet عبر QR.',
    modalAdd: 'إضافة مشارك',
    fldName: 'الاسم الكامل', fldEmail: 'البريد الإلكتروني', fldPhone: 'الجوال', fldEmployee: 'الرقم الوظيفي',
    fldDept: 'القسم', fldActivity: 'النشاط', fldAttendance: 'الحضور', fldCert: 'حالة الشهادة',
    fldNotes: 'ملاحظات', save: 'حفظ', saving: 'جاري الحفظ…', cancel: 'إلغاء',
    requiredName: 'الاسم مطلوب.', requiredEmail: 'البريد الإلكتروني مطلوب.',
  },
} as const

const STORAGE_KEY = 'pmnh-participants-v1'

const ATT_LABEL: Record<AttendanceStatus, keyof typeof DICT.en> = {
  registered: 'attRegistered', attended: 'attAttended', absent: 'attAbsent', cancelled: 'attCancelled',
}
const ATT_COLOR: Record<AttendanceStatus, string> = {
  registered: 'bg-blue-100 text-blue-700 border-blue-200',
  attended: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  absent: 'bg-orange-100 text-orange-700 border-orange-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
}
const CERT_LABEL: Record<CertificateStatus, keyof typeof DICT.en> = {
  not_issued: 'certNotIssued', pending: 'certPending', issued: 'certIssued',
}
const CERT_COLOR: Record<CertificateStatus, string> = {
  not_issued: 'bg-gray-100 text-gray-600 border-gray-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  issued: 'bg-violet-100 text-violet-700 border-violet-200',
}

function load(): Participant[] {
  if (typeof window === 'undefined') return []
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw) } catch {/* ignore */}
  return seed()
}
function save(list: Participant[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {/* ignore */}
}
function seed(): Participant[] {
  return [
    { id: 'p1', full_name: 'Sara Al-Malki', email: 'sara@pmnh.gov.sa', employee_id: 'EMP-1042', department_id: 'd6', activity: 'Research Methodology Foundations', registered_at: new Date(Date.now() - 7 * 86400000).toISOString(), attendance: 'attended', certificate: 'issued' },
    { id: 'p2', full_name: 'Ahmed Al-Qahtani', email: 'ahmed@pmnh.gov.sa', employee_id: 'EMP-1109', department_id: 'd5', activity: 'Research Methodology Foundations', registered_at: new Date(Date.now() - 7 * 86400000).toISOString(), attendance: 'attended', certificate: 'issued' },
    { id: 'p3', full_name: 'Norah Al-Subaie', email: 'norah@pmnh.gov.sa', employee_id: 'EMP-1207', department_id: 'd3', activity: 'IRB Application Writing', registered_at: new Date(Date.now() - 3 * 86400000).toISOString(), attendance: 'registered', certificate: 'not_issued' },
    { id: 'p4', full_name: 'Mohammed Al-Asiri', email: 'm.asiri@pmnh.gov.sa', employee_id: 'EMP-1305', department_id: 'd7', activity: 'Statistics for Clinical Research', registered_at: new Date(Date.now() - 2 * 86400000).toISOString(), attendance: 'registered', certificate: 'pending' },
    { id: 'p5', full_name: 'Layla Al-Ghamdi', email: 'layla@pmnh.gov.sa', employee_id: 'EMP-1412', department_id: 'd6', activity: 'IRB Application Writing', registered_at: new Date(Date.now() - 4 * 86400000).toISOString(), attendance: 'absent', certificate: 'not_issued' },
  ]
}

export default function ParticipantsPage() {
  const { isRtl, toggle, t } = useLang(DICT)
  const [items, setItems] = useState<Participant[]>([])
  useEffect(() => { setItems(load()) }, [])
  useEffect(() => { if (items.length) save(items) }, [items])

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [attFilter, setAttFilter] = useState<AttendanceStatus | 'all'>('all')
  const [certFilter, setCertFilter] = useState<CertificateStatus | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = useMemo(() => items.filter(p => {
    if (search) {
      const q = search.toLowerCase()
      const hay = `${p.full_name} ${p.email} ${p.employee_id || ''} ${p.activity}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (deptFilter !== 'all' && p.department_id !== deptFilter) return false
    if (attFilter !== 'all' && p.attendance !== attFilter) return false
    if (certFilter !== 'all' && p.certificate !== certFilter) return false
    return true
  }), [items, search, deptFilter, attFilter, certFilter])

  const stats = useMemo(() => ({
    total: items.length,
    attended: items.filter(p => p.attendance === 'attended').length,
    absent: items.filter(p => p.attendance === 'absent').length,
    cert: items.filter(p => p.certificate === 'issued').length,
  }), [items])

  function handleSave(p: Participant) {
    setItems(prev => [p, ...prev])
    setModalOpen(false)
    toast.success(t.saved)
  }
  function handleDelete(id: string) {
    if (!confirm(t.deleteConfirm)) return
    setItems(prev => prev.filter(p => p.id !== id))
    toast.success(t.deleted)
  }
  function exportCsv() {
    const header = ['Full Name', 'Email', 'Phone', 'Employee ID', 'Department', 'Activity', 'Attendance', 'Certificate', 'Registered']
    const rows = filtered.map(p => [
      p.full_name, p.email, p.phone || '', p.employee_id || '',
      DEMO_DEPARTMENTS.find(d => d.id === p.department_id)?.name || '',
      p.activity, p.attendance, p.certificate, p.registered_at,
    ])
    const csv = [header, ...rows]
      .map(row => row.map(c => /[",\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(','))
      .join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `participants-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(a.href)
    toast.success('Exported')
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5">

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UserRound className="w-6 h-6 text-blue-600" />
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
          <button type="button" onClick={exportCsv} className="btn-secondary text-sm">
            <FileSpreadsheet className="w-4 h-4" />{t.export}
          </button>
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />{t.addNew}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.statTotal,    value: stats.total,    color: 'blue',    icon: UserRound },
          { label: t.statAttended, value: stats.attended, color: 'emerald', icon: CheckCircle },
          { label: t.statAbsent,   value: stats.absent,   color: 'orange',  icon: BadgeCheck },
          { label: t.statCert,     value: stats.cert,     color: 'violet',  icon: Award },
        ].map(s => (
          <div key={s.label} className={cn(
            'premium-card p-4 flex items-center gap-3',
            s.color === 'blue'    && (isRtl ? 'border-r-4 border-r-blue-500'    : 'border-l-4 border-l-blue-500'),
            s.color === 'emerald' && (isRtl ? 'border-r-4 border-r-emerald-500' : 'border-l-4 border-l-emerald-500'),
            s.color === 'orange'  && (isRtl ? 'border-r-4 border-r-orange-500'  : 'border-l-4 border-l-orange-500'),
            s.color === 'violet'  && (isRtl ? 'border-r-4 border-r-violet-500'  : 'border-l-4 border-l-violet-500'),
          )}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
              s.color === 'blue'    && 'bg-blue-100 text-blue-600',
              s.color === 'emerald' && 'bg-emerald-100 text-emerald-600',
              s.color === 'orange'  && 'bg-orange-100 text-orange-600',
              s.color === 'violet'  && 'bg-violet-100 text-violet-600',
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
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                 placeholder={t.searchPh}
                 className={cn('form-input', isRtl ? 'pe-9' : 'ps-9')} />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="form-input w-auto min-w-[160px]">
          <option value="all">{t.allDepts}</option>
          {DEMO_DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={attFilter} onChange={e => setAttFilter(e.target.value as AttendanceStatus | 'all')} className="form-input w-auto min-w-[140px]">
          <option value="all">{t.allAttendance}</option>
          {(Object.keys(ATT_LABEL) as AttendanceStatus[]).map(k => <option key={k} value={k}>{t[ATT_LABEL[k]]}</option>)}
        </select>
        <select value={certFilter} onChange={e => setCertFilter(e.target.value as CertificateStatus | 'all')} className="form-input w-auto min-w-[150px]">
          <option value="all">{t.allCert}</option>
          {(Object.keys(CERT_LABEL) as CertificateStatus[]).map(k => <option key={k} value={k}>{t[CERT_LABEL[k]]}</option>)}
        </select>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.colName}</th><th>{t.colContact}</th><th>{t.colEmployee}</th>
                <th>{t.colDept}</th><th>{t.colActivity}</th><th>{t.colReg}</th>
                <th>{t.colAttendance}</th><th>{t.colCert}</th><th>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16 text-gray-400">
                  <UserRound className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold text-gray-700">{t.none}</p>
                  <p className="text-xs mt-1">{t.noneSub}</p>
                </td></tr>
              ) : filtered.map(p => {
                const dept = p.department_id ? DEMO_DEPARTMENTS.find(d => d.id === p.department_id) : undefined
                return (
                  <tr key={p.id}>
                    <td><span className="font-semibold text-sm text-gray-900">{p.full_name}</span></td>
                    <td>
                      <p className="text-[11px] text-gray-700 inline-flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" />{p.email}</p>
                      {p.phone && <p className="text-[11px] text-gray-500 inline-flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{p.phone}</p>}
                    </td>
                    <td><span className="font-mono text-[11px] text-gray-700">{p.employee_id || '—'}</span></td>
                    <td>
                      {dept ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: dept.color }}>
                          <Building2 className="w-3 h-3" />{dept.name}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td><span className="text-xs text-gray-700">{p.activity}</span></td>
                    <td><span className="text-xs text-gray-500">{formatDate(p.registered_at)}</span></td>
                    <td><span className={cn('badge text-[11px]', ATT_COLOR[p.attendance])}>{t[ATT_LABEL[p.attendance]]}</span></td>
                    <td><span className={cn('badge text-[11px]', CERT_COLOR[p.certificate])}>{t[CERT_LABEL[p.certificate]]}</span></td>
                    <td>
                      <button type="button" onClick={() => handleDelete(p.id)}
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
  onSave: (p: Participant) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [activity, setActivity] = useState('')
  const [attendance, setAttendance] = useState<AttendanceStatus>('registered')
  const [certificate, setCertificate] = useState<CertificateStatus>('not_issued')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) { toast.error(t.requiredName); return }
    if (!email.trim()) { toast.error(t.requiredEmail); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 200))
    onSave({
      id: `p-${Date.now().toString(36)}`,
      full_name: name.trim(), email: email.trim(), phone: phone.trim() || undefined,
      employee_id: employeeId.trim().toUpperCase() || undefined,
      department_id: departmentId || undefined,
      activity: activity.trim() || '—',
      registered_at: new Date().toISOString(),
      attendance, certificate, notes: notes.trim() || undefined,
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
              <UserRound className="w-5 h-5 text-blue-600" />{t.modalAdd}
            </h2>
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 py-5 space-y-4">
            <Field label={t.fldName} required>
              <input value={name} onChange={e => setName(e.target.value)} className="form-input" autoFocus />
            </Field>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.fldEmail} required>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" dir="ltr" />
              </Field>
              <Field label={t.fldPhone}>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="form-input" dir="ltr" />
              </Field>
              <Field label={t.fldEmployee}>
                <input value={employeeId} onChange={e => setEmployeeId(e.target.value.toUpperCase())} className="form-input font-mono" dir="ltr" />
              </Field>
              <Field label={t.fldDept}>
                <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="form-input">
                  <option value="">—</option>
                  {DEMO_DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label={t.fldActivity}>
              <input value={activity} onChange={e => setActivity(e.target.value)} className="form-input" />
            </Field>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.fldAttendance}>
                <select value={attendance} onChange={e => setAttendance(e.target.value as AttendanceStatus)} className="form-input">
                  {(Object.keys(ATT_LABEL) as AttendanceStatus[]).map(k => <option key={k} value={k}>{t[ATT_LABEL[k]]}</option>)}
                </select>
              </Field>
              <Field label={t.fldCert}>
                <select value={certificate} onChange={e => setCertificate(e.target.value as CertificateStatus)} className="form-input">
                  {(Object.keys(CERT_LABEL) as CertificateStatus[]).map(k => <option key={k} value={k}>{t[CERT_LABEL[k]]}</option>)}
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
