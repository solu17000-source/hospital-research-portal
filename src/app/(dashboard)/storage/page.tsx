'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  AlertTriangle, ArchiveRestore, BadgeCheck, BookOpen, Building2, ChevronRight,
  CloudUpload, Download, Edit2, Eye, File as FileIcon, FileSpreadsheet,
  FileText, Filter, FlaskConical, Folder, Globe, HardDrive, Image as ImageIcon,
  Languages, Lock, Plus, Search, Tag, Trash2, Upload, Users, X,
} from 'lucide-react'

import { useAuthStore } from '@/lib/auth-store'
import { DEMO_DEPARTMENTS, DEMO_RESEARCH } from '@/lib/demo-data'
import { isDemoMode } from '@/lib/supabase'
import { cn, formatDate, formatFileSize, timeAgo } from '@/lib/utils'

type Lang = 'en' | 'ar'
type FileVisibility = 'public' | 'internal' | 'admin'
type FileCategory =
  | 'irb' | 'ethics' | 'consent' | 'protocol' | 'data' | 'manuscript'
  | 'publication' | 'workshop' | 'attendance' | 'image' | 'other'

type StoredFile = {
  id: string
  name: string
  mime: string
  ext: string
  size: number
  dataUrl?: string         // inlined for small files (<512 KB) — bigger files we just keep metadata
  category: FileCategory
  research_id?: string
  department_id?: string
  visibility: FileVisibility
  uploaded_by: string
  uploaded_at: string
  downloads: number
  notes?: string
}

type AuditAction = 'upload' | 'download' | 'delete' | 'rename' | 'view'
type AuditRow = { id: string; at: string; actor: string; action: AuditAction; subject: string; details?: string }

// ----- Translations -----

const T = {
  en: {
    title: 'File Storage',
    subtitle: 'Hospital-wide research documents, attachments and reports.',
    languageBtn: 'العربية',
    liveData: 'Live data',
    demoData: 'Demo data — uploaded files are kept in this browser only',
    upload: 'Upload',
    dragHere: 'Drag & drop files here, or click to browse',
    dragHint: 'PDF · Word · Excel · PowerPoint · images · up to 5 MB per file',
    dropNow: 'Drop now!',
    storageUsage: 'Storage usage',
    statSize: '{size} of {limit} used',
    statFilesCount: '{n} files',
    statPdfs: 'PDFs',
    statDocuments: 'Documents',
    statSpreadsheets: 'Spreadsheets',
    statImages: 'Images',
    statOther: 'Other',
    searchPh: 'Search by file name, research, owner…',
    allCategories: 'All categories',
    allResearch: 'All research',
    allVisibility: 'All visibility',
    catIrb: 'IRB approval',
    catEthics: 'Ethics application',
    catConsent: 'Consent form',
    catProtocol: 'Research protocol',
    catData: 'Data collection',
    catManuscript: 'Manuscript',
    catPublication: 'Publication',
    catWorkshop: 'Workshop / training',
    catAttendance: 'Attendance',
    catImage: 'Image',
    catOther: 'Other',
    visPublic: 'Public',
    visInternal: 'Internal',
    visAdmin: 'Admin only',
    colFile: 'File',
    colResearch: 'Research',
    colCategory: 'Category',
    colVis: 'Visibility',
    colOwner: 'Uploaded by',
    colDate: 'Uploaded',
    colSize: 'Size',
    colDownloads: 'Downloads',
    colActions: 'Actions',
    none: 'No files match your filters.',
    noneSub: 'Drag a file onto the box above or click Upload.',
    preview: 'Preview',
    download: 'Download',
    rename: 'Rename',
    deleteFile: 'Delete',
    deleteConfirm: 'Delete this file? This cannot be undone.',
    renamePrompt: 'New file name:',
    audit: 'Audit log (recent)',
    seeAllAudit: 'Open full audit',
    actorYou: 'you',
    actionUpload: 'uploaded',
    actionDownload: 'downloaded',
    actionDelete: 'deleted',
    actionRename: 'renamed',
    actionView: 'viewed',
    closePreview: 'Close preview',
    notInline: 'Preview not available — download to view.',
    fileTooLarge: 'File too large (max 5 MB).',
    fileUnsupported: 'Unsupported file type.',
    uploaded: 'Uploaded.',
    renamed: 'Renamed.',
    deleted: 'Deleted.',
    storedInline: '(inlined)',
    storedRef: '(metadata only)',
    metaTitle: 'File details',
    metaName: 'Name',
    metaMime: 'Type',
    metaSize: 'Size',
    metaUploaded: 'Uploaded',
    metaVisibility: 'Visibility',
    metaCategory: 'Category',
    metaResearch: 'Linked research',
    metaOwner: 'Owner',
    metaDownloads: 'Downloads',
    metaNotes: 'Notes',
    metaUnlink: '—',
    accessDenied: 'You do not have access to delete or rename these files.',
  },
  ar: {
    title: 'تخزين الملفات',
    subtitle: 'وثائق ومرفقات وتقارير الأبحاث على مستوى المستشفى.',
    languageBtn: 'English',
    liveData: 'بيانات مباشرة',
    demoData: 'بيانات تجريبية — الملفات محفوظة في هذا المتصفح فقط',
    upload: 'رفع',
    dragHere: 'اسحب الملفات إلى هنا، أو اضغط للاختيار',
    dragHint: 'PDF · Word · Excel · PowerPoint · صور · حتى 5 ميجابايت لكل ملف',
    dropNow: 'أفلت الآن!',
    storageUsage: 'استخدام التخزين',
    statSize: 'تم استخدام {size} من {limit}',
    statFilesCount: '{n} ملف',
    statPdfs: 'PDF',
    statDocuments: 'مستندات',
    statSpreadsheets: 'جداول',
    statImages: 'صور',
    statOther: 'أخرى',
    searchPh: 'ابحث باسم الملف، البحث، المالك…',
    allCategories: 'كل التصنيفات',
    allResearch: 'كل الأبحاث',
    allVisibility: 'كل مستويات الظهور',
    catIrb: 'موافقة IRB',
    catEthics: 'الطلب الأخلاقي',
    catConsent: 'نموذج الموافقة',
    catProtocol: 'بروتوكول البحث',
    catData: 'جمع البيانات',
    catManuscript: 'المخطوطة',
    catPublication: 'النشر',
    catWorkshop: 'ورشة / تدريب',
    catAttendance: 'حضور',
    catImage: 'صورة',
    catOther: 'أخرى',
    visPublic: 'عام',
    visInternal: 'داخلي',
    visAdmin: 'للمسؤول فقط',
    colFile: 'الملف',
    colResearch: 'البحث',
    colCategory: 'التصنيف',
    colVis: 'الظهور',
    colOwner: 'بواسطة',
    colDate: 'تاريخ الرفع',
    colSize: 'الحجم',
    colDownloads: 'التنزيلات',
    colActions: 'إجراءات',
    none: 'لا توجد ملفات تطابق فلاترك.',
    noneSub: 'اسحب ملفًا أو اضغط زر الرفع.',
    preview: 'معاينة',
    download: 'تنزيل',
    rename: 'إعادة تسمية',
    deleteFile: 'حذف',
    deleteConfirm: 'هل ترغب بحذف هذا الملف؟ لا يمكن التراجع.',
    renamePrompt: 'الاسم الجديد:',
    audit: 'سجل التدقيق (الأحدث)',
    seeAllAudit: 'فتح السجل الكامل',
    actorYou: 'أنت',
    actionUpload: 'رفع',
    actionDownload: 'تنزيل',
    actionDelete: 'حذف',
    actionRename: 'إعادة تسمية',
    actionView: 'معاينة',
    closePreview: 'إغلاق المعاينة',
    notInline: 'المعاينة غير متاحة — قم بالتنزيل للعرض.',
    fileTooLarge: 'الملف كبير جدًا (حد 5 ميجابايت).',
    fileUnsupported: 'نوع ملف غير مدعوم.',
    uploaded: 'تم الرفع.',
    renamed: 'تمت إعادة التسمية.',
    deleted: 'تم الحذف.',
    storedInline: '(مدرج)',
    storedRef: '(بيانات وصفية فقط)',
    metaTitle: 'تفاصيل الملف',
    metaName: 'الاسم',
    metaMime: 'النوع',
    metaSize: 'الحجم',
    metaUploaded: 'الرفع',
    metaVisibility: 'الظهور',
    metaCategory: 'التصنيف',
    metaResearch: 'البحث المرتبط',
    metaOwner: 'المالك',
    metaDownloads: 'التنزيلات',
    metaNotes: 'ملاحظات',
    metaUnlink: '—',
    accessDenied: 'ليست لديك صلاحية لحذف أو تعديل هذه الملفات.',
  },
} as const

type Translations = { [K in keyof (typeof T)['en']]: string }

function readLangCookie(): Lang {
  if (typeof document === 'undefined') return 'en'
  const m = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/)
  return m?.[1] === 'ar' ? 'ar' : 'en'
}
function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

const STORAGE_KEY = 'pmnh-files-v1'
const AUDIT_KEY   = 'pmnh-files-audit-v1'
const MAX_SIZE    = 5 * 1024 * 1024 // 5 MB per file
const INLINE_CAP  = 512 * 1024      // inline files <=512 KB as data URLs
const SUPPORTED_EXT = ['pdf','doc','docx','xls','xlsx','ppt','pptx','png','jpg','jpeg','gif','webp','svg','txt','csv']

const CAT_LABEL: Record<FileCategory, keyof Translations> = {
  irb: 'catIrb', ethics: 'catEthics', consent: 'catConsent', protocol: 'catProtocol',
  data: 'catData', manuscript: 'catManuscript', publication: 'catPublication',
  workshop: 'catWorkshop', attendance: 'catAttendance', image: 'catImage', other: 'catOther',
}

function extOf(name: string) { return (name.split('.').pop() || '').toLowerCase() }
function kindOf(ext: string): 'pdf' | 'doc' | 'sheet' | 'slides' | 'image' | 'text' | 'other' {
  if (ext === 'pdf') return 'pdf'
  if (['doc','docx'].includes(ext)) return 'doc'
  if (['xls','xlsx','csv'].includes(ext)) return 'sheet'
  if (['ppt','pptx'].includes(ext)) return 'slides'
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return 'image'
  if (ext === 'txt') return 'text'
  return 'other'
}
const KIND_ICON: Record<ReturnType<typeof kindOf>, React.ComponentType<{ className?: string }>> = {
  pdf: FileText, doc: FileText, sheet: FileSpreadsheet, slides: FileText,
  image: ImageIcon, text: FileText, other: FileIcon,
}
const KIND_COLOR: Record<ReturnType<typeof kindOf>, string> = {
  pdf: '#dc2626', doc: '#2563eb', sheet: '#16a34a', slides: '#ea580c',
  image: '#a855f7', text: '#475569', other: '#64748b',
}

function loadFiles(): StoredFile[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredFile[]
  } catch {/* ignore */}
  return seedFiles()
}
function saveFiles(files: StoredFile[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(files)) } catch {
    // localStorage quota — strip data URLs from saved copy so metadata survives.
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(files.map(f => ({ ...f, dataUrl: undefined })))) } catch {/* ignore */}
    toast.error('Storage quota reached — file content not saved for next session')
  }
}
function loadAudit(): AuditRow[] {
  try { const raw = localStorage.getItem(AUDIT_KEY); if (raw) return JSON.parse(raw) } catch {/* ignore */}
  return []
}
function saveAudit(rows: AuditRow[]) {
  try { localStorage.setItem(AUDIT_KEY, JSON.stringify(rows.slice(0, 200))) } catch {/* ignore */}
}

function seedFiles(): StoredFile[] {
  // Mirror what the previous seed list showed so the page never feels empty.
  return [
    { id: 'f1', name: 'PMNH-2024-0001-IRB-Approval.pdf', mime: 'application/pdf', ext: 'pdf', size: 245120, category: 'irb',         research_id: 'r1', visibility: 'internal', uploaded_by: 'Sultan Alallah',         uploaded_at: '2024-01-20T09:00:00Z', downloads: 5 },
    { id: 'f2', name: 'Nursing-Burnout-Data-Collection.xlsx', mime: 'application/vnd.ms-excel', ext: 'xlsx', size: 1048576, category: 'data',  research_id: 'r2', visibility: 'internal', uploaded_by: 'Afnan Bakri',            uploaded_at: '2024-04-15T10:30:00Z', downloads: 3 },
    { id: 'f3', name: 'Antibiotic-Resistance-Manuscript-v3.docx', mime: 'application/msword', ext: 'docx', size: 524288, category: 'manuscript', research_id: 'r3', visibility: 'admin',  uploaded_by: 'Dr. Khalid Al-Ghamdi',    uploaded_at: '2026-04-01T11:45:00Z', downloads: 2 },
    { id: 'f4', name: 'Pediatric-Obesity-Protocol.pdf', mime: 'application/pdf', ext: 'pdf', size: 389120, category: 'protocol',  research_id: 'r4', visibility: 'internal', uploaded_by: 'Dr. Fatima Al-Zahrani',  uploaded_at: '2024-05-10T08:00:00Z', downloads: 7 },
    { id: 'f5', name: 'Cardiac-Rehabilitation-Consent.pdf', mime: 'application/pdf', ext: 'pdf', size: 102400, category: 'consent',   research_id: 'r5', visibility: 'internal', uploaded_by: 'Dr. Mohammed Al-Asiri',  uploaded_at: '2025-02-01T10:15:00Z', downloads: 4 },
    { id: 'f6', name: 'ICU-Hypertension-Publication.pdf', mime: 'application/pdf', ext: 'pdf', size: 786432, category: 'publication', research_id: 'r1', visibility: 'public',   uploaded_by: 'Sultan Alallah',         uploaded_at: '2025-02-10T14:00:00Z', downloads: 12 },
    { id: 'f7', name: 'AI-Radiology-Ethics-Application.pdf', mime: 'application/pdf', ext: 'pdf', size: 307200, category: 'ethics', research_id: 'r8', visibility: 'admin', uploaded_by: 'Dr. Ibrahim Al-Dosari', uploaded_at: '2026-02-20T09:30:00Z', downloads: 1 },
  ]
}

// =============== Main page ===============

export default function StoragePage() {
  const { user } = useAuthStore()

  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => { setLang(readLangCookie()) }, [])
  useEffect(() => {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])
  const t = T[lang] as Translations
  const isRtl = lang === 'ar'

  // Files state
  const [files, setFiles] = useState<StoredFile[]>([])
  useEffect(() => { setFiles(loadFiles()) }, [])
  useEffect(() => { if (files.length) saveFiles(files) }, [files])

  // Audit
  const [audit, setAudit] = useState<AuditRow[]>([])
  useEffect(() => { setAudit(loadAudit()) }, [])
  function logAudit(action: AuditAction, subject: string, details?: string) {
    const entry: AuditRow = {
      id: `flog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      at: new Date().toISOString(),
      actor: user?.full_name || 'system',
      action, subject, details,
    }
    setAudit(prev => {
      const next = [entry, ...prev]
      saveAudit(next)
      return next
    })
  }

  // Filters
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<FileCategory | 'all'>('all')
  const [researchFilter, setResearchFilter] = useState<string>('all')
  const [visFilter, setVisFilter] = useState<FileVisibility | 'all'>('all')
  const [isDragging, setIsDragging] = useState(false)

  // Preview modal
  const [previewId, setPreviewId] = useState<string | null>(null)
  const preview = useMemo(() => files.find(f => f.id === previewId) || null, [files, previewId])

  const inputRef = useRef<HTMLInputElement>(null)

  // Derived
  const filtered = useMemo(() => {
    return files.filter(f => {
      if (search) {
        const q = search.toLowerCase()
        const hay = `${f.name} ${f.research_id || ''} ${f.uploaded_by} ${f.notes || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (catFilter !== 'all' && f.category !== catFilter) return false
      if (researchFilter !== 'all' && f.research_id !== researchFilter) return false
      if (visFilter !== 'all' && f.visibility !== visFilter) return false
      return true
    })
  }, [files, search, catFilter, researchFilter, visFilter])

  const stats = useMemo(() => {
    const total = files.reduce((acc, f) => acc + f.size, 0)
    const limit = 10 * 1024 * 1024 * 1024  // 10 GB
    const pdfs   = files.filter(f => kindOf(f.ext) === 'pdf').length
    const docs   = files.filter(f => kindOf(f.ext) === 'doc' || kindOf(f.ext) === 'slides' || kindOf(f.ext) === 'text').length
    const sheets = files.filter(f => kindOf(f.ext) === 'sheet').length
    const images = files.filter(f => kindOf(f.ext) === 'image').length
    const other  = files.length - pdfs - docs - sheets - images
    return { total, limit, count: files.length, pdfs, docs, sheets, images, other }
  }, [files])

  // -------- Upload handlers --------
  const handleFiles = useCallback(async (incoming: FileList | File[]) => {
    const list = Array.from(incoming)
    for (const file of list) {
      const ext = extOf(file.name)
      if (!SUPPORTED_EXT.includes(ext)) { toast.error(`${file.name}: ${t.fileUnsupported}`); continue }
      if (file.size > MAX_SIZE) { toast.error(`${file.name}: ${t.fileTooLarge}`); continue }

      let dataUrl: string | undefined
      if (file.size <= INLINE_CAP) {
        dataUrl = await new Promise<string>((res, rej) => {
          const reader = new FileReader()
          reader.onload = () => res(typeof reader.result === 'string' ? reader.result : '')
          reader.onerror = () => rej(reader.error)
          reader.readAsDataURL(file)
        }).catch(() => undefined)
      }

      const id = `file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      const rec: StoredFile = {
        id,
        name: file.name,
        mime: file.type || `application/${ext}`,
        ext,
        size: file.size,
        dataUrl,
        category: guessCategory(file.name),
        visibility: 'internal',
        uploaded_by: user?.full_name || 'unknown',
        uploaded_at: new Date().toISOString(),
        downloads: 0,
      }
      setFiles(prev => [rec, ...prev])
      logAudit('upload', rec.name, `${formatFileSize(rec.size)} · ${rec.ext.toUpperCase()}`)
    }
    toast.success(t.uploaded)
  }, [t.fileUnsupported, t.fileTooLarge, t.uploaded, user?.full_name])  // eslint-disable-line react-hooks/exhaustive-deps

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      void handleFiles(e.target.files)
      e.target.value = ''
    }
  }
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files)
  }

  // -------- File actions --------
  function downloadFile(f: StoredFile) {
    if (!f.dataUrl) {
      toast.error(`${f.name}: ${t.notInline}`)
      return
    }
    const a = document.createElement('a')
    a.href = f.dataUrl
    a.download = f.name
    document.body.appendChild(a); a.click(); a.remove()
    setFiles(prev => prev.map(x => x.id === f.id ? { ...x, downloads: x.downloads + 1 } : x))
    logAudit('download', f.name)
  }
  function deleteFile(id: string) {
    const f = files.find(x => x.id === id)
    if (!f) return
    if (!confirm(t.deleteConfirm)) return
    setFiles(prev => prev.filter(x => x.id !== id))
    logAudit('delete', f.name)
    toast.success(t.deleted)
  }
  function renameFile(id: string) {
    const f = files.find(x => x.id === id)
    if (!f) return
    const next = window.prompt(t.renamePrompt, f.name)
    if (!next || next === f.name) return
    setFiles(prev => prev.map(x => x.id === id ? { ...x, name: next } : x))
    logAudit('rename', f.name, `→ ${next}`)
    toast.success(t.renamed)
  }
  function updateField(id: string, patch: Partial<StoredFile>) {
    setFiles(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x))
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5">

      {/* ===== Header ===== */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-blue-600" />
            {t.title}
          </h1>
          <p className="page-subtitle">
            {t.subtitle}
            <span className="mx-2 text-gray-300" aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5 text-xs">
              <span className={cn('inline-block w-1.5 h-1.5 rounded-full', isDemoMode ? 'bg-amber-400' : 'bg-emerald-400')} aria-hidden />
              {isDemoMode ? t.demoData : t.liveData}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="btn-secondary text-sm"
          >
            <Languages className="w-4 h-4" />
            {t.languageBtn}
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-primary text-sm"
          >
            <Upload className="w-4 h-4" />
            {t.upload}
          </button>
          <input
            ref={inputRef} type="file" multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.svg,.txt,.csv"
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      </div>

      {/* ===== Storage usage ===== */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div>
            <p className="font-bold text-gray-900">{t.storageUsage}</p>
            <p className="text-sm text-gray-500">
              {format(t.statSize, { size: formatFileSize(stats.total), limit: '10 GB' })}
              <span className="mx-2 text-gray-300" aria-hidden>·</span>
              {format(t.statFilesCount, { n: stats.count })}
            </p>
          </div>
          <p className="text-sm font-bold text-blue-600 tabular-nums">
            {((stats.total / stats.limit) * 100).toFixed(2)}%
          </p>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, (stats.total / stats.limit) * 100)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          {[
            { label: t.statPdfs,         count: stats.pdfs,    color: '#dc2626' },
            { label: t.statDocuments,    count: stats.docs,    color: '#2563eb' },
            { label: t.statSpreadsheets, count: stats.sheets,  color: '#16a34a' },
            { label: t.statImages,       count: stats.images,  color: '#a855f7' },
            { label: t.statOther,        count: stats.other,   color: '#64748b' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-100 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: s.color + '18', color: s.color }}>
                <FileIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 tabular-nums">{s.count}</p>
                <p className="text-[11px] text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Drop zone ===== */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.click() }}
        className={cn(
          'rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all select-none',
          isDragging ? 'border-blue-400 bg-blue-50/70' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50',
        )}
      >
        <CloudUpload className={cn('w-10 h-10 mx-auto mb-3', isDragging ? 'text-blue-500' : 'text-gray-300')} />
        <p className={cn('font-semibold text-sm', isDragging ? 'text-blue-700' : 'text-gray-700')}>
          {isDragging ? t.dropNow : t.dragHere}
        </p>
        <p className="text-xs text-gray-400 mt-1">{t.dragHint}</p>
      </div>

      {/* ===== Filters ===== */}
      <div className="premium-card p-4 flex flex-wrap gap-3 items-center">
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
        <select value={catFilter} onChange={e => setCatFilter(e.target.value as FileCategory | 'all')} className="form-input w-auto min-w-[170px]">
          <option value="all">{t.allCategories}</option>
          {(Object.keys(CAT_LABEL) as FileCategory[]).map(k => (
            <option key={k} value={k}>{t[CAT_LABEL[k]]}</option>
          ))}
        </select>
        <select value={researchFilter} onChange={e => setResearchFilter(e.target.value)} className="form-input w-auto min-w-[200px]">
          <option value="all">{t.allResearch}</option>
          {DEMO_RESEARCH.slice(0, 30).map(r => (
            <option key={r.id} value={r.id}>{r.research_id}</option>
          ))}
        </select>
        <select value={visFilter} onChange={e => setVisFilter(e.target.value as FileVisibility | 'all')} className="form-input w-auto min-w-[150px]">
          <option value="all">{t.allVisibility}</option>
          <option value="public">{t.visPublic}</option>
          <option value="internal">{t.visInternal}</option>
          <option value="admin">{t.visAdmin}</option>
        </select>
      </div>

      {/* ===== Files table ===== */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="min-w-[260px]">{t.colFile}</th>
                <th>{t.colResearch}</th>
                <th>{t.colCategory}</th>
                <th>{t.colVis}</th>
                <th>{t.colOwner}</th>
                <th>{t.colDate}</th>
                <th>{t.colSize}</th>
                <th>{t.colDownloads}</th>
                <th>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
                    <FileIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold text-gray-700">{t.none}</p>
                    <p className="text-xs mt-1">{t.noneSub}</p>
                  </td>
                </tr>
              ) : (
                filtered.map(f => {
                  const kind = kindOf(f.ext)
                  const Icon = KIND_ICON[kind]
                  const tint = KIND_COLOR[kind]
                  const research = f.research_id ? DEMO_RESEARCH.find(r => r.id === f.research_id) : undefined
                  return (
                    <tr key={f.id}>
                      <td>
                        <button
                          type="button"
                          onClick={() => setPreviewId(f.id)}
                          className="flex items-center gap-3 group text-start min-w-0 w-full"
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: tint + '18', color: tint }}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                              {f.name}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {f.ext.toUpperCase()} · {f.dataUrl ? t.storedInline : t.storedRef}
                            </p>
                          </div>
                        </button>
                      </td>
                      <td>
                        {research ? (
                          <Link href={`/research/${research.id}`} className="font-mono text-xs text-blue-700 hover:underline">
                            {research.research_id}
                          </Link>
                        ) : (
                          <select
                            value={f.research_id || ''}
                            onChange={e => updateField(f.id, { research_id: e.target.value || undefined })}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                          >
                            <option value="">—</option>
                            {DEMO_RESEARCH.slice(0, 30).map(r => <option key={r.id} value={r.id}>{r.research_id}</option>)}
                          </select>
                        )}
                      </td>
                      <td>
                        <select
                          value={f.category}
                          onChange={e => updateField(f.id, { category: e.target.value as FileCategory })}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                        >
                          {(Object.keys(CAT_LABEL) as FileCategory[]).map(k => (
                            <option key={k} value={k}>{t[CAT_LABEL[k]]}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <VisibilityPicker value={f.visibility} onChange={v => updateField(f.id, { visibility: v })} t={t} />
                      </td>
                      <td><span className="text-xs text-gray-600">{f.uploaded_by}</span></td>
                      <td><span className="text-xs text-gray-500">{formatDate(f.uploaded_at)}</span></td>
                      <td><span className="text-xs text-gray-500 tabular-nums">{formatFileSize(f.size)}</span></td>
                      <td><span className="text-sm font-semibold text-gray-700 tabular-nums">{f.downloads}</span></td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewId(f.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            title={t.preview}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadFile(f)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            title={t.download}
                            disabled={!f.dataUrl}
                          >
                            <Download className={cn('w-3.5 h-3.5', !f.dataUrl && 'opacity-30')} />
                          </button>
                          <button
                            type="button"
                            onClick={() => renameFile(f.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                            title={t.rename}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFile(f.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            title={t.deleteFile}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Audit log ===== */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-blue-600" />
            {t.audit}
          </h2>
          <Link href="/activity-logs" className="text-xs text-blue-700 hover:text-blue-800 font-semibold">
            {t.seeAllAudit}
          </Link>
        </div>
        {audit.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">—</p>
        ) : (
          <ul className="space-y-1.5">
            {audit.slice(0, 8).map(a => (
              <li key={a.id} className="flex items-start gap-3 rounded-xl p-2 text-xs hover:bg-gray-50">
                <span className="font-mono text-gray-400">{timeAgo(a.at)}</span>
                <span className="font-semibold text-gray-800">{a.actor}</span>
                <span className="text-gray-500">{t[`action${a.action.charAt(0).toUpperCase()}${a.action.slice(1)}` as keyof Translations] ?? a.action}</span>
                <span className="text-gray-900 font-medium">{a.subject}</span>
                {a.details && <span className="text-gray-400">· {a.details}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ===== Preview modal ===== */}
      <AnimatePresence>
        {preview && (
          <PreviewModal
            file={preview}
            t={t}
            isRtl={isRtl}
            onClose={() => setPreviewId(null)}
            onDownload={() => downloadFile(preview)}
            onDelete={() => { deleteFile(preview.id); setPreviewId(null) }}
            onRename={() => renameFile(preview.id)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// =============== Subcomponents ===============

function VisibilityPicker({
  value, onChange, t,
}: {
  value: FileVisibility
  onChange: (v: FileVisibility) => void
  t: Translations
}) {
  const map = {
    public:   { icon: Globe, color: 'text-blue-700 bg-blue-50',     label: t.visPublic },
    internal: { icon: Users, color: 'text-purple-700 bg-purple-50', label: t.visInternal },
    admin:    { icon: Lock,  color: 'text-rose-700 bg-rose-50',     label: t.visAdmin },
  } as const
  const { icon: Icon, color, label } = map[value]
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={e => onChange(e.target.value as FileVisibility)}
        className={cn('appearance-none text-[11px] font-semibold border-0 rounded-md ps-7 pe-6 py-1', color)}
      >
        <option value="public">{t.visPublic}</option>
        <option value="internal">{t.visInternal}</option>
        <option value="admin">{t.visAdmin}</option>
      </select>
      <Icon className="absolute top-1/2 -translate-y-1/2 start-1.5 w-3 h-3 pointer-events-none" />
    </div>
  )
}

function PreviewModal({
  file, t, isRtl, onClose, onDownload, onDelete, onRename,
}: {
  file: StoredFile
  t: Translations
  isRtl: boolean
  onClose: () => void
  onDownload: () => void
  onDelete: () => void
  onRename: () => void
}) {
  const kind = kindOf(file.ext)
  const research = file.research_id ? DEMO_RESEARCH.find(r => r.id === file.research_id) : undefined
  const dept = file.department_id ? DEMO_DEPARTMENTS.find(d => d.id === file.department_id) : undefined

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-40"
        aria-hidden
      />
      <motion.div
        role="dialog" aria-modal="true"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: KIND_COLOR[kind] + '18', color: KIND_COLOR[kind] }}
              >
                {(() => { const Icon = KIND_ICON[kind]; return <Icon className="w-5 h-5" /> })()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{file.name}</p>
                <p className="text-[11px] text-gray-500">
                  {file.ext.toUpperCase()} · {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={onRename} className="btn-secondary text-xs">
                <Edit2 className="w-3.5 h-3.5" />
                {t.rename}
              </button>
              <button type="button" onClick={onDownload} className="btn-secondary text-xs" disabled={!file.dataUrl}>
                <Download className="w-3.5 h-3.5" />
                {t.download}
              </button>
              <button type="button" onClick={onDelete} className="btn-secondary text-xs text-red-600 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
                {t.deleteFile}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label={t.closePreview}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-0 flex-1">
            <div className="md:col-span-2 p-6 bg-gray-50 min-h-[400px] flex items-center justify-center">
              {file.dataUrl ? (
                kind === 'image' ? (
                  <img src={file.dataUrl} alt={file.name} className="max-w-full max-h-[60vh] rounded-xl shadow object-contain" />
                ) : kind === 'pdf' ? (
                  <iframe src={file.dataUrl} className="w-full h-[60vh] rounded-xl bg-white shadow" title={file.name} />
                ) : kind === 'text' ? (
                  <iframe src={file.dataUrl} className="w-full h-[60vh] rounded-xl bg-white shadow" title={file.name} />
                ) : (
                  <div className="text-center text-gray-400">
                    <FileIcon className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-semibold">{t.notInline}</p>
                  </div>
                )
              ) : (
                <div className="text-center text-gray-400">
                  <FileIcon className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-semibold">{t.notInline}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-s border-gray-100 space-y-4">
              <h3 className="font-bold text-gray-900 text-sm">{t.metaTitle}</h3>
              <MetaRow label={t.metaName}     value={file.name} mono />
              <MetaRow label={t.metaMime}     value={file.mime} mono />
              <MetaRow label={t.metaSize}     value={formatFileSize(file.size)} />
              <MetaRow label={t.metaUploaded} value={formatDate(file.uploaded_at)} />
              <MetaRow label={t.metaOwner}    value={file.uploaded_by} />
              <MetaRow label={t.metaCategory} value={t[CAT_LABEL[file.category]]} />
              <MetaRow label={t.metaVisibility}
                       value={file.visibility === 'public' ? t.visPublic : file.visibility === 'internal' ? t.visInternal : t.visAdmin} />
              <MetaRow label={t.metaResearch}
                       value={research ? research.research_id : t.metaUnlink}
                       link={research ? `/research/${research.id}` : undefined} />
              {dept && <MetaRow label="Department" value={dept.name} />}
              <MetaRow label={t.metaDownloads} value={String(file.downloads)} />
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

function MetaRow({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      {link ? (
        <Link href={link} className={cn('text-sm font-semibold text-blue-700 hover:underline truncate block', mono && 'font-mono')}>
          {value}
        </Link>
      ) : (
        <p className={cn('text-sm text-gray-800 truncate', mono && 'font-mono')}>{value}</p>
      )}
    </div>
  )
}

function guessCategory(name: string): FileCategory {
  const lower = name.toLowerCase()
  if (lower.includes('irb') || lower.includes('approval')) return 'irb'
  if (lower.includes('ethics')) return 'ethics'
  if (lower.includes('consent')) return 'consent'
  if (lower.includes('protocol')) return 'protocol'
  if (lower.includes('manuscript') || lower.includes('draft')) return 'manuscript'
  if (lower.includes('publication') || lower.includes('published')) return 'publication'
  if (lower.includes('data') || lower.includes('dataset')) return 'data'
  if (lower.includes('workshop') || lower.includes('training')) return 'workshop'
  if (lower.includes('attendance')) return 'attendance'
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(lower)) return 'image'
  return 'other'
}
