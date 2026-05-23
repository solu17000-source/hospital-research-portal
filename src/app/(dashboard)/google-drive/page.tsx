'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  AlertTriangle, CheckCircle, Cloud, ExternalLink, FileSpreadsheet, FileText,
  FolderOpen, Languages, Link2, Plus, RefreshCw, Search, Sparkles, Trash2, X,
} from 'lucide-react'

import { extractSheetId, mergeParticipants, type SyncParticipant, type SyncResult } from '@/lib/google-sync'
import { useLang } from '@/lib/i18n'
import { isDemoMode } from '@/lib/supabase'
import { cn, timeAgo } from '@/lib/utils'

type LinkKind = 'sheet' | 'form' | 'folder' | 'file'

type DriveLink = {
  id: string
  title: string
  url: string
  kind: LinkKind
  description?: string
  last_sync_at?: string
  last_sync_count?: number
  last_sync_error?: string
  participants?: SyncParticipant[]
  created_at: string
}

const DICT = {
  en: {
    pageTitle: 'Google Drive Integration',
    pageSub: 'Connect Google Sheets, Forms, Drive folders and files. Sync registrations into the platform.',
    languageBtn: 'العربية', liveData: 'Live data', demoData: 'Demo data — saved locally',
    addNew: 'Connect new', searchPh: 'Search by title or URL…',
    statTotal: 'Connected items', statSheets: 'Sheets',
    statForms: 'Forms', statSynced: 'Participants synced',
    allKinds: 'All kinds',
    kindSheet: 'Google Sheet', kindForm: 'Google Form',
    kindFolder: 'Drive folder', kindFile: 'Drive file',
    colTitle: 'Title', colKind: 'Kind', colUrl: 'URL',
    colLastSync: 'Last sync', colCount: 'Imported', colActions: 'Actions',
    syncNow: 'Sync', syncing: 'Syncing…',
    deleteConfirm: 'Disconnect this item?', deleted: 'Disconnected.', saved: 'Connected.',
    none: 'No connected items yet.', noneSub: 'Click "Connect new" to add a Google Sheet, Form or Drive folder.',
    modalAdd: 'Connect a Google source',
    fldTitle: 'Title', fldUrl: 'URL', fldKind: 'Kind', fldDescription: 'Description',
    save: 'Save', saving: 'Saving…', cancel: 'Cancel',
    requiredTitle: 'Title is required.', requiredUrl: 'URL is required.',
    syncOk: '{n} new participants synced ({total} total).',
    syncOnlySheets: 'Sync is available for Google Sheets only.',
    importedFromSheet: 'Synced from {sheetUrl}',
    syncError: 'Sync error',
  },
  ar: {
    pageTitle: 'تكامل Google Drive',
    pageSub: 'اربط Google Sheets ونماذج Google ومجلدات Drive، وزامن التسجيلات مع المنصة.',
    languageBtn: 'English', liveData: 'بيانات مباشرة', demoData: 'بيانات تجريبية — محفوظة محليًا',
    addNew: 'ربط جديد', searchPh: 'ابحث بالعنوان أو الرابط…',
    statTotal: 'العناصر المتصلة', statSheets: 'جداول',
    statForms: 'نماذج', statSynced: 'مشاركون متزامنون',
    allKinds: 'كل الأنواع',
    kindSheet: 'جدول Google', kindForm: 'نموذج Google',
    kindFolder: 'مجلد Drive', kindFile: 'ملف Drive',
    colTitle: 'العنوان', colKind: 'النوع', colUrl: 'الرابط',
    colLastSync: 'آخر مزامنة', colCount: 'تم استيراده', colActions: 'إجراءات',
    syncNow: 'مزامنة', syncing: 'جاري…',
    deleteConfirm: 'فصل هذا العنصر؟', deleted: 'تم الفصل.', saved: 'تم الربط.',
    none: 'لا توجد عناصر متصلة بعد.', noneSub: 'اضغط "ربط جديد" لإضافة جدول أو نموذج أو مجلد Drive.',
    modalAdd: 'ربط مصدر Google',
    fldTitle: 'العنوان', fldUrl: 'الرابط', fldKind: 'النوع', fldDescription: 'الوصف',
    save: 'حفظ', saving: 'جاري الحفظ…', cancel: 'إلغاء',
    requiredTitle: 'العنوان مطلوب.', requiredUrl: 'الرابط مطلوب.',
    syncOk: 'تمت مزامنة {n} مشارك جديد ({total} إجمالي).',
    syncOnlySheets: 'المزامنة متاحة فقط لـ Google Sheets.',
    importedFromSheet: 'مستورد من {sheetUrl}',
    syncError: 'خطأ في المزامنة',
  },
} as const

const STORAGE_KEY = 'pmnh-google-drive-v1'

const KIND_LABEL: Record<LinkKind, keyof typeof DICT.en> = {
  sheet: 'kindSheet', form: 'kindForm', folder: 'kindFolder', file: 'kindFile',
}
const KIND_ICON: Record<LinkKind, React.ComponentType<{ className?: string }>> = {
  sheet: FileSpreadsheet, form: FileText, folder: FolderOpen, file: Cloud,
}
const KIND_COLOR: Record<LinkKind, string> = {
  sheet: '#16a34a', form: '#7c3aed', folder: '#f59e0b', file: '#0891b2',
}

function load(): DriveLink[] {
  if (typeof window === 'undefined') return []
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw) } catch {/* ignore */}
  return seed()
}
function save(list: DriveLink[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {/* ignore */}
}
function seed(): DriveLink[] {
  return [
    { id: 'gd1', title: 'Methodology Workshop Attendees', url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',  kind: 'sheet',  description: 'Auto-populated from workshop QR registration form.', last_sync_at: new Date(Date.now() - 2 * 86400000).toISOString(), last_sync_count: 30, created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: 'gd2', title: 'Journal Club Attendance Form',    url: 'https://forms.gle/pmnh-jc-attendance',                                                       kind: 'form',   description: 'Monthly attendance check-in form.', created_at: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: 'gd3', title: 'Research Unit — Shared Documents', url: 'https://drive.google.com/drive/folders/research-unit-shared',                              kind: 'folder', description: 'Templates, IRB forms, and policy documents.', created_at: new Date(Date.now() - 60 * 86400000).toISOString() },
  ]
}

export default function GoogleDrivePage() {
  const { isRtl, toggle, t } = useLang(DICT)
  const [items, setItems] = useState<DriveLink[]>([])
  useEffect(() => { setItems(load()) }, [])
  useEffect(() => { if (items.length) save(items) }, [items])

  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<LinkKind | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const filtered = useMemo(() => items.filter(d => {
    if (search) {
      const q = search.toLowerCase()
      if (!`${d.title} ${d.url}`.toLowerCase().includes(q)) return false
    }
    if (kindFilter !== 'all' && d.kind !== kindFilter) return false
    return true
  }), [items, search, kindFilter])

  const stats = useMemo(() => ({
    total: items.length,
    sheets: items.filter(d => d.kind === 'sheet').length,
    forms: items.filter(d => d.kind === 'form').length,
    synced: items.reduce((acc, d) => acc + (d.last_sync_count ?? 0), 0),
  }), [items])

  function handleSave(d: DriveLink) {
    setItems(prev => [d, ...prev])
    setModalOpen(false)
    toast.success(t.saved)
  }
  function handleDelete(id: string) {
    if (!confirm(t.deleteConfirm)) return
    setItems(prev => prev.filter(d => d.id !== id))
    toast.success(t.deleted)
  }

  async function handleSync(d: DriveLink) {
    if (d.kind !== 'sheet') { toast.error(t.syncOnlySheets); return }
    setSyncingId(d.id)
    try {
      const resp = await fetch('/api/google-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ qrId: `drive-${d.id}`, sheetUrl: d.url }),
      })
      const body = await resp.json()
      if (!resp.ok) {
        setItems(prev => prev.map(x => x.id === d.id ? { ...x, last_sync_at: new Date().toISOString(), last_sync_error: body?.error || `HTTP ${resp.status}` } : x))
        toast.error(`${t.syncError}: ${body?.error || resp.status}`)
        return
      }
      const result = body as SyncResult
      const existing = d.participants || []
      const { merged, added } = mergeParticipants(existing, result.participants)
      setItems(prev => prev.map(x => x.id === d.id ? {
        ...x,
        participants: merged,
        last_sync_at: result.fetched_at,
        last_sync_count: merged.length,
        last_sync_error: undefined,
      } : x))
      toast.success(t.syncOk.replace('{n}', String(added)).replace('{total}', String(merged.length)))
    } catch (e) {
      const err = (e as Error).message
      setItems(prev => prev.map(x => x.id === d.id ? { ...x, last_sync_at: new Date().toISOString(), last_sync_error: err } : x))
      toast.error(`${t.syncError}: ${err}`)
    } finally {
      setSyncingId(null)
    }
  }

  // Try to guess the kind from a pasted URL — saves the admin a dropdown.
  function guessKind(url: string): LinkKind {
    if (/docs\.google\.com\/spreadsheets|sheets\.googleapis/.test(url)) return 'sheet'
    if (/forms\.gle|docs\.google\.com\/forms/.test(url)) return 'form'
    if (/drive\.google\.com\/drive\/folders|drive\.google\.com\/folders/.test(url)) return 'folder'
    return 'file'
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5">

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Cloud className="w-6 h-6 text-blue-600" />
            {t.pageTitle}
          </h1>
          <p className="page-subtitle">
            {t.pageSub}
            <span className="mx-2 text-gray-300" aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5 text-xs">
              <span className={cn('inline-block w-1.5 h-1.5 rounded-full', isDemoMode ? 'bg-amber-400' : 'bg-emerald-400')} />
              {isDemoMode ? t.demoData : t.liveData}
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
          { label: t.statTotal,  value: stats.total,  color: 'blue',    icon: Cloud },
          { label: t.statSheets, value: stats.sheets, color: 'emerald', icon: FileSpreadsheet },
          { label: t.statForms,  value: stats.forms,  color: 'violet',  icon: FileText },
          { label: t.statSynced, value: stats.synced, color: 'amber',   icon: CheckCircle },
        ].map(s => (
          <div key={s.label} className={cn(
            'premium-card p-4 flex items-center gap-3',
            s.color === 'blue'    && (isRtl ? 'border-r-4 border-r-blue-500'    : 'border-l-4 border-l-blue-500'),
            s.color === 'emerald' && (isRtl ? 'border-r-4 border-r-emerald-500' : 'border-l-4 border-l-emerald-500'),
            s.color === 'violet'  && (isRtl ? 'border-r-4 border-r-violet-500'  : 'border-l-4 border-l-violet-500'),
            s.color === 'amber'   && (isRtl ? 'border-r-4 border-r-amber-500'   : 'border-l-4 border-l-amber-500'),
          )}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
              s.color === 'blue'    && 'bg-blue-100 text-blue-600',
              s.color === 'emerald' && 'bg-emerald-100 text-emerald-600',
              s.color === 'violet'  && 'bg-violet-100 text-violet-600',
              s.color === 'amber'   && 'bg-amber-100 text-amber-600',
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
        <select value={kindFilter} onChange={e => setKindFilter(e.target.value as LinkKind | 'all')} className="form-input w-auto min-w-[160px]">
          <option value="all">{t.allKinds}</option>
          {(Object.keys(KIND_LABEL) as LinkKind[]).map(k => <option key={k} value={k}>{t[KIND_LABEL[k]]}</option>)}
        </select>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.colTitle}</th><th>{t.colKind}</th><th>{t.colUrl}</th>
                <th>{t.colLastSync}</th><th>{t.colCount}</th><th>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400">
                  <Cloud className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold text-gray-700">{t.none}</p>
                  <p className="text-xs mt-1">{t.noneSub}</p>
                </td></tr>
              ) : filtered.map(d => {
                const Icon = KIND_ICON[d.kind]
                const tint = KIND_COLOR[d.kind]
                return (
                  <tr key={d.id}>
                    <td>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                             style={{ background: tint + '18', color: tint }}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{d.title}</p>
                          {d.description && <p className="text-[11px] text-gray-500 truncate">{d.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                            style={{ background: tint + '18', color: tint }}>
                        {t[KIND_LABEL[d.kind]]}
                      </span>
                    </td>
                    <td>
                      <a href={d.url} target="_blank" rel="noopener noreferrer"
                         className="text-[11px] font-mono text-blue-700 hover:underline inline-flex items-center gap-1 max-w-[260px] truncate">
                        <Link2 className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{d.url}</span>
                      </a>
                    </td>
                    <td>
                      {d.last_sync_at ? (
                        d.last_sync_error ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            {timeAgo(d.last_sync_at)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-600">{timeAgo(d.last_sync_at)}</span>
                        )
                      ) : <span className="text-[11px] text-gray-400">—</span>}
                    </td>
                    <td><span className="text-xs tabular-nums text-gray-700">{d.last_sync_count ?? 0}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <a href={d.url} target="_blank" rel="noopener noreferrer"
                           className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                           title="Open in Google">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        {d.kind === 'sheet' && (
                          <button type="button"
                                  onClick={() => handleSync(d)}
                                  disabled={syncingId === d.id}
                                  title={t.syncNow}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-50">
                            <RefreshCw className={cn('w-3.5 h-3.5', syncingId === d.id && 'animate-spin')} />
                          </button>
                        )}
                        <button type="button" onClick={() => handleDelete(d.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
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
        {modalOpen && <AddModal t={t} isRtl={isRtl} guessKind={guessKind} onClose={() => setModalOpen(false)} onSave={handleSave} />}
      </AnimatePresence>
    </div>
  )
}

function AddModal({
  t, isRtl, guessKind, onClose, onSave,
}: {
  t: Record<keyof typeof DICT.en, string>
  isRtl: boolean
  guessKind: (url: string) => LinkKind
  onClose: () => void
  onSave: (d: DriveLink) => void
}) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [kind, setKind] = useState<LinkKind>('sheet')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  function handleUrlChange(value: string) {
    setUrl(value)
    if (value) setKind(guessKind(value))
  }

  async function handleSubmit() {
    if (!title.trim()) { toast.error(t.requiredTitle); return }
    if (!url.trim()) { toast.error(t.requiredUrl); return }
    if (kind === 'sheet' && !extractSheetId(url)) {
      toast.error('Could not detect Sheet ID — paste the spreadsheet URL again.')
      return
    }
    setSaving(true)
    await new Promise(r => setTimeout(r, 200))
    onSave({
      id: `gd-${Date.now().toString(36)}`,
      title: title.trim(), url: url.trim(), kind,
      description: description.trim() || undefined,
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
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="font-bold text-gray-900 text-lg inline-flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-600" />{t.modalAdd}
            </h2>
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 py-5 space-y-4">
            <Field label={t.fldTitle} required>
              <input value={title} onChange={e => setTitle(e.target.value)} className="form-input" autoFocus />
            </Field>
            <Field label={t.fldUrl} required>
              <input value={url} onChange={e => handleUrlChange(e.target.value)} placeholder="https://docs.google.com/…" className="form-input" dir="ltr" />
            </Field>
            <Field label={t.fldKind}>
              <select value={kind} onChange={e => setKind(e.target.value as LinkKind)} className="form-input">
                {(Object.keys(KIND_LABEL) as LinkKind[]).map(k => <option key={k} value={k}>{t[KIND_LABEL[k]]}</option>)}
              </select>
            </Field>
            <Field label={t.fldDescription}>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="form-input" />
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
