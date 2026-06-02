'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import QRCode from 'react-qr-code'
import {
  AlertTriangle, Building2, Calendar, Camera, CheckCircle, ChevronRight,
  Copy, Download, ExternalLink, Eye, FileSpreadsheet, FileText, FolderOpen,
  Globe, GraduationCap, Image as ImageIcon, Languages, Lock, Plus, Presentation,
  Printer, QrCode as QrCodeIcon, RefreshCw, Search, Share2, Sparkles, Trash2,
  Upload, Users, X,
} from 'lucide-react'

import { useDepartments } from '@/lib/data-source'
import { mergeParticipants, type SyncParticipant, type SyncResult } from '@/lib/google-sync'
import { cn, formatDate, timeAgo } from '@/lib/utils'
import type { Department } from '@/types'

// ---------------- Types ----------------

type Lang = 'en' | 'ar'
type QrType =
  | 'research' | 'workshop' | 'training_course' | 'journal_club'
  | 'conference' | 'attendance' | 'public_registration' | 'custom'
type QrVisibility = 'public' | 'internal' | 'admin'
type QrStatus = 'active' | 'inactive' | 'expired'

type QrRecord = {
  id: string
  title: string
  title_ar?: string
  type: QrType
  related_label?: string
  department_id?: string
  registration_url?: string
  google_form_url?: string
  google_sheet_url?: string
  google_drive_url?: string
  uploaded_image?: string // data URL when admin uploaded an existing QR
  start_date?: string
  end_date?: string
  visibility: QrVisibility
  scan_count: number
  created_at: string
  notes?: string
}

// ---------------- Translations ----------------

const T = {
  en: {
    title: 'QR Code & Registration',
    subtitle: 'Create, upload and manage QR codes for research, workshops, training and registrations.',
    languageBtn: 'العربية',
    liveData: 'Live data',
    demoData: 'Demo data — your QR records are saved locally in this browser',
    newQr: 'New QR Code',
    upload: 'Upload existing',
    statTotal: 'Total QR codes',
    statActive: 'Active',
    statScans: 'Total scans',
    statExpiring: 'Expiring in 30 days',
    searchPh: 'Search QR codes…',
    allTypes: 'All types',
    allVisibility: 'All visibility',
    allStatus: 'All status',
    typeResearch: 'Research project',
    typeWorkshop: 'Workshop',
    typeTraining: 'Training course',
    typeJournal: 'Journal club',
    typeConference: 'Conference',
    typeAttendance: 'Participant attendance',
    typePublic: 'Public registration',
    typeCustom: 'Custom URL',
    visPublic: 'Public',
    visInternal: 'Internal',
    visAdmin: 'Admin only',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    statusExpired: 'Expired',
    none: 'No QR codes found.',
    noneSub: 'Click "New QR Code" to create your first record.',
    select: 'Select a QR code',
    selectSub: 'Choose a record on the left, or create a new one.',
    scanCount: '{n} scans',
    department: 'Department',
    period: 'Active period',
    visibility: 'Visibility',
    linkedSources: 'Linked sources',
    googleForm: 'Google Form',
    googleSheet: 'Google Sheet',
    googleDrive: 'Google Drive',
    registrationUrl: 'Registration link',
    targetUrl: 'QR target URL',
    actions: 'Actions',
    downloadSvg: 'Download SVG',
    downloadPng: 'Download PNG',
    print: 'Print',
    copyLink: 'Copy link',
    copied: 'Copied to clipboard',
    share: 'Share',
    deleteQr: 'Delete',
    deleteConfirm: 'Delete this QR record?',
    deleted: 'QR record deleted.',
    scannerTitle: 'QR Code Scanner',
    scannerOpen: 'Open scanner',
    scannerClose: 'Close scanner',
    scanInstructions1: 'Allow camera permissions when prompted.',
    scanInstructions2: 'Point the camera at any QR generated here.',
    scanInstructions3: 'The linked page or registration form will open.',
    scanInstructions4: 'Submitted data flows back to the platform if linked to a Google Sheet.',
    simulateScan: 'Simulate scan',
    scanned: 'Scanned',
    syncTitle: 'Google Sheet sync',
    syncBtn: 'Sync now',
    syncing: 'Syncing…',
    syncNoSheet: 'Add a Google Sheet URL to enable sync.',
    syncNever: 'Never synced',
    syncLast: 'Last sync {when}',
    syncResult: 'Imported {added} new, skipped {skipped} duplicates ({total} total).',
    syncError: 'Sync error',
    syncedParticipants: 'Synced participants',
    syncedNone: 'No participants synced yet.',
    syncedCol1: 'Name',
    syncedCol2: 'Email',
    syncedCol3: 'Department',
    syncedCol4: 'Registered',
    recentScans: 'Recent QR scans',
    colTitle: 'Title',
    colType: 'Type',
    colVis: 'Visibility',
    colScans: 'Scans',
    colStatus: 'Status',
    colCreated: 'Created',
    yes: 'Yes', no: 'No',
    // Modal
    modalAddTitle: 'New QR Code',
    modalEditTitle: 'Edit QR code',
    fldTitle: 'Title',
    fldTitleAr: 'Arabic title',
    fldType: 'Linked activity',
    fldRelated: 'Related research / activity',
    fldRelatedPh: 'Pick or type the related item (e.g. workshop name)',
    fldDept: 'Department',
    fldRegistrationUrl: 'Registration / target URL',
    fldRegistrationUrlPh: 'https://…',
    fldGoogleForm: 'Google Form URL',
    fldGoogleSheet: 'Google Sheet URL',
    fldGoogleDrive: 'Google Drive folder / file URL',
    fldStart: 'Start date',
    fldEnd: 'End date',
    fldVisibility: 'Visibility',
    fldUpload: 'Upload existing QR image (optional)',
    fldUploadHint: 'PNG / JPG / SVG up to 500 KB',
    save: 'Save QR code',
    saving: 'Saving…',
    cancel: 'Cancel',
    requiredTitle: 'Title is required.',
    requiredTarget: 'Provide at least one URL (registration, form, sheet or drive).',
    saved: 'QR record saved.',
    activeNow: 'Active now',
    expiresOn: 'Expires {date}',
    pickQrType: 'Pick the activity this QR links to',
  },
  ar: {
    title: 'إدارة رموز QR والتسجيل',
    subtitle: 'إنشاء ورفع وإدارة رموز QR للأبحاث وورش العمل والتدريب والتسجيل.',
    languageBtn: 'English',
    liveData: 'بيانات مباشرة',
    demoData: 'بيانات تجريبية — سجلات QR محفوظة محليًا في هذا المتصفح',
    newQr: 'رمز QR جديد',
    upload: 'رفع رمز موجود',
    statTotal: 'إجمالي رموز QR',
    statActive: 'نشط',
    statScans: 'إجمالي المسحات',
    statExpiring: 'ينتهي خلال 30 يومًا',
    searchPh: 'ابحث في رموز QR…',
    allTypes: 'كل الأنواع',
    allVisibility: 'كل مستويات الظهور',
    allStatus: 'كل الحالات',
    typeResearch: 'مشروع بحثي',
    typeWorkshop: 'ورشة عمل',
    typeTraining: 'دورة تدريبية',
    typeJournal: 'النادي البحثي',
    typeConference: 'مؤتمر',
    typeAttendance: 'تسجيل حضور',
    typePublic: 'تسجيل عام',
    typeCustom: 'رابط مخصص',
    visPublic: 'عام',
    visInternal: 'داخلي',
    visAdmin: 'للمسؤول فقط',
    statusActive: 'نشط',
    statusInactive: 'غير نشط',
    statusExpired: 'منتهي',
    none: 'لا توجد رموز QR.',
    noneSub: 'اضغط "رمز QR جديد" لإنشاء أول سجل.',
    select: 'اختر رمز QR',
    selectSub: 'اختر سجلًا من القائمة، أو أنشئ جديدًا.',
    scanCount: '{n} عملية مسح',
    department: 'القسم',
    period: 'فترة النشاط',
    visibility: 'الظهور',
    linkedSources: 'المصادر المرتبطة',
    googleForm: 'نموذج Google',
    googleSheet: 'جدول Google',
    googleDrive: 'مجلد Google Drive',
    registrationUrl: 'رابط التسجيل',
    targetUrl: 'الرابط الهدف للرمز',
    actions: 'إجراءات',
    downloadSvg: 'تحميل SVG',
    downloadPng: 'تحميل PNG',
    print: 'طباعة',
    copyLink: 'نسخ الرابط',
    copied: 'تم النسخ',
    share: 'مشاركة',
    deleteQr: 'حذف',
    deleteConfirm: 'حذف سجل QR هذا؟',
    deleted: 'تم حذف السجل.',
    scannerTitle: 'ماسح رموز QR',
    scannerOpen: 'فتح الماسح',
    scannerClose: 'إغلاق الماسح',
    scanInstructions1: 'اسمح بأذونات الكاميرا عند الطلب.',
    scanInstructions2: 'وجّه الكاميرا إلى أي رمز QR تم إنشاؤه هنا.',
    scanInstructions3: 'ستفتح صفحة الوجهة أو نموذج التسجيل تلقائيًا.',
    scanInstructions4: 'تتدفق البيانات المرسلة إلى المنصة إذا كان مرتبطًا بـ Google Sheet.',
    simulateScan: 'محاكاة مسح',
    scanned: 'تم المسح',
    syncTitle: 'مزامنة Google Sheet',
    syncBtn: 'مزامنة الآن',
    syncing: 'جاري المزامنة…',
    syncNoSheet: 'أضف رابط Google Sheet لتفعيل المزامنة.',
    syncNever: 'لم تتم المزامنة بعد',
    syncLast: 'آخر مزامنة {when}',
    syncResult: 'استيراد {added} جديد، تجاوز {skipped} مكررًا ({total} إجمالًا).',
    syncError: 'خطأ في المزامنة',
    syncedParticipants: 'المشاركون المزامنون',
    syncedNone: 'لم تتم مزامنة مشاركين بعد.',
    syncedCol1: 'الاسم',
    syncedCol2: 'البريد',
    syncedCol3: 'القسم',
    syncedCol4: 'تاريخ التسجيل',
    recentScans: 'آخر عمليات المسح',
    colTitle: 'العنوان',
    colType: 'النوع',
    colVis: 'الظهور',
    colScans: 'المسحات',
    colStatus: 'الحالة',
    colCreated: 'تاريخ الإنشاء',
    yes: 'نعم', no: 'لا',
    modalAddTitle: 'رمز QR جديد',
    modalEditTitle: 'تعديل رمز QR',
    fldTitle: 'العنوان',
    fldTitleAr: 'العنوان بالعربية',
    fldType: 'النشاط المرتبط',
    fldRelated: 'العنصر المرتبط',
    fldRelatedPh: 'اختر أو اكتب اسم العنصر المرتبط',
    fldDept: 'القسم',
    fldRegistrationUrl: 'رابط التسجيل / الوجهة',
    fldRegistrationUrlPh: 'https://…',
    fldGoogleForm: 'رابط نموذج Google',
    fldGoogleSheet: 'رابط جدول Google',
    fldGoogleDrive: 'رابط مجلد أو ملف Google Drive',
    fldStart: 'تاريخ البداية',
    fldEnd: 'تاريخ النهاية',
    fldVisibility: 'الظهور',
    fldUpload: 'رفع صورة QR موجودة (اختياري)',
    fldUploadHint: 'PNG / JPG / SVG حتى 500 كيلوبايت',
    save: 'حفظ رمز QR',
    saving: 'جاري الحفظ…',
    cancel: 'إلغاء',
    requiredTitle: 'العنوان مطلوب.',
    requiredTarget: 'يجب إدخال رابط واحد على الأقل (تسجيل، نموذج، جدول، أو Drive).',
    saved: 'تم حفظ السجل.',
    activeNow: 'نشط الآن',
    expiresOn: 'ينتهي بتاريخ {date}',
    pickQrType: 'حدد النشاط الذي يرتبط به الرمز',
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

const TYPE_LABEL_KEY: Record<QrType, keyof Translations> = {
  research: 'typeResearch',
  workshop: 'typeWorkshop',
  training_course: 'typeTraining',
  journal_club: 'typeJournal',
  conference: 'typeConference',
  attendance: 'typeAttendance',
  public_registration: 'typePublic',
  custom: 'typeCustom',
}
const TYPE_ICON: Record<QrType, React.ComponentType<{ className?: string }>> = {
  research: Sparkles,
  workshop: GraduationCap,
  training_course: GraduationCap,
  journal_club: FileText,
  conference: Presentation,
  attendance: Users,
  public_registration: Globe,
  custom: QrCodeIcon,
}
const TYPE_COLOR: Record<QrType, string> = {
  research: '#2563eb',
  workshop: '#16a34a',
  training_course: '#0d9488',
  journal_club: '#7c3aed',
  conference: '#db2777',
  attendance: '#f59e0b',
  public_registration: '#0891b2',
  custom: '#475569',
}

// Resolve which URL the QR encodes. Priority: registration > form > sheet > drive > placeholder.
function targetUrl(q: QrRecord): string {
  if (q.registration_url) return q.registration_url
  if (q.google_form_url) return q.google_form_url
  if (q.google_sheet_url) return q.google_sheet_url
  if (q.google_drive_url) return q.google_drive_url
  if (typeof window !== 'undefined') return `${window.location.origin}/visitor?qr=${q.id}`
  return `https://pmnh-research.gov.sa/qr/${q.id}`
}

function statusOf(q: QrRecord): QrStatus {
  if (q.end_date && new Date(q.end_date) < new Date()) return 'expired'
  return 'active'
}

// ---- Local persistence (window.storage spec — we shim onto localStorage) ----
const STORAGE_KEY = 'pmnh-qr-records-v1'
const PARTICIPANTS_KEY = 'pmnh-qr-participants-v1'
const SYNC_LOG_KEY     = 'pmnh-qr-sync-log-v1'

type SyncLogEntry = { at: string; ok: boolean; added: number; skipped: number; total: number; error?: string }
type ParticipantsMap = Record<string, SyncParticipant[]>
type SyncLogMap = Record<string, SyncLogEntry>

function loadParticipants(): ParticipantsMap {
  if (typeof window === 'undefined') return {}
  try { const raw = localStorage.getItem(PARTICIPANTS_KEY); if (raw) return JSON.parse(raw) } catch {/* ignore */}
  return {}
}
function saveParticipants(p: ParticipantsMap) {
  try { localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(p)) } catch {/* ignore */}
}
function loadSyncLog(): SyncLogMap {
  if (typeof window === 'undefined') return {}
  try { const raw = localStorage.getItem(SYNC_LOG_KEY); if (raw) return JSON.parse(raw) } catch {/* ignore */}
  return {}
}
function saveSyncLog(l: SyncLogMap) {
  try { localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(l)) } catch {/* ignore */}
}
function loadRecords(): QrRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as QrRecord[]
  } catch { /* ignore */ }
  return seedRecords()
}
function saveRecords(records: QrRecord[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)) } catch { /* ignore */ }
}
function seedRecords(): QrRecord[] {
  // The QR records list starts empty — codes appear only after the user
  // creates them through the New-QR modal. No seed.
  return []
}

// ----------- Main page -----------

export default function QRCodesPage() {
  const [lang, setLang] = useState<Lang>('en')
  useEffect(() => { setLang(readLangCookie()) }, [])
  useEffect(() => {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])
  const t = T[lang] as Translations
  const isRtl = lang === 'ar'

  // Live Supabase departments — powers the per-row badge lookup and the
  // dropdown in the New-QR modal.
  const { data: deptData } = useDepartments()
  const departments: Department[] = deptData ?? []
  const DEPT_BY_ID = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments])

  const [records, setRecords] = useState<QrRecord[]>([])
  useEffect(() => { setRecords(loadRecords()) }, [])
  useEffect(() => { if (records.length) saveRecords(records) }, [records])

  // Synced participants per QR + last-sync log per QR.
  const [participants, setParticipants] = useState<ParticipantsMap>({})
  const [syncLog, setSyncLog] = useState<SyncLogMap>({})
  const [syncingId, setSyncingId] = useState<string | null>(null)
  useEffect(() => { setParticipants(loadParticipants()); setSyncLog(loadSyncLog()) }, [])
  useEffect(() => { saveParticipants(participants) }, [participants])
  useEffect(() => { saveSyncLog(syncLog) }, [syncLog])

  async function syncFromSheet(qr: QrRecord) {
    if (!qr.google_sheet_url) return
    setSyncingId(qr.id)
    try {
      const resp = await fetch('/api/google-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ qrId: qr.id, sheetUrl: qr.google_sheet_url }),
      })
      const body = await resp.json()
      if (!resp.ok) {
        const err: SyncLogEntry = { at: new Date().toISOString(), ok: false, added: 0, skipped: 0, total: 0, error: body?.error || `HTTP ${resp.status}` }
        setSyncLog(prev => ({ ...prev, [qr.id]: err }))
        toast.error(`${t.syncError}: ${err.error}`)
        return
      }
      const result = body as SyncResult
      const existing = participants[qr.id] || []
      const { merged, added, skipped } = mergeParticipants(existing, result.participants)
      setParticipants(prev => ({ ...prev, [qr.id]: merged }))
      // Bump scan_count to the number of imported participants — a real proxy
      // for how many people have used this QR. (Replace with a real scan-log
      // count once we tie scans to Supabase events.)
      setRecords(prev => prev.map(r => r.id === qr.id ? { ...r, scan_count: Math.max(r.scan_count, merged.length) } : r))
      const log: SyncLogEntry = { at: result.fetched_at, ok: true, added, skipped, total: merged.length }
      setSyncLog(prev => ({ ...prev, [qr.id]: log }))
      toast.success(format(t.syncResult, { added, skipped, total: merged.length }))
    } catch (e) {
      const err: SyncLogEntry = { at: new Date().toISOString(), ok: false, added: 0, skipped: 0, total: 0, error: (e as Error).message }
      setSyncLog(prev => ({ ...prev, [qr.id]: err }))
      toast.error(`${t.syncError}: ${err.error}`)
    } finally {
      setSyncingId(null)
    }
  }

  // Filter state
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<QrType | 'all'>('all')
  const [visFilter, setVisFilter] = useState<QrVisibility | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<QrStatus | 'all'>('all')

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (search) {
        const q = search.toLowerCase()
        if (!r.title.toLowerCase().includes(q) && !(r.related_label || '').toLowerCase().includes(q)) return false
      }
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (visFilter !== 'all' && r.visibility !== visFilter) return false
      if (statusFilter !== 'all' && statusOf(r) !== statusFilter) return false
      return true
    })
  }, [records, search, typeFilter, visFilter, statusFilter])

  // Selection
  const [selectedId, setSelectedId] = useState<string | null>(null)
  useEffect(() => {
    if (!selectedId && filtered.length) setSelectedId(filtered[0].id)
    if (selectedId && !records.find(r => r.id === selectedId)) setSelectedId(filtered[0]?.id ?? null)
  }, [filtered, records, selectedId])

  const selected = useMemo(() => records.find(r => r.id === selectedId) || null, [records, selectedId])

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const openCreate = () => setModalOpen(true)
  const closeModal = () => setModalOpen(false)

  // Scanner panel
  const [scanMode, setScanMode] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  function simulateScan() {
    const r = records[Math.floor(Math.random() * records.length)]
    if (!r) return
    setScanResult(r.title)
    setRecords(prev => prev.map(rec => rec.id === r.id ? { ...rec, scan_count: rec.scan_count + 1 } : rec))
    toast.success(`${t.scanned}: ${r.title}`)
    setTimeout(() => setScanResult(null), 4000)
  }

  // Stats
  const stats = useMemo(() => {
    const total = records.length
    const active = records.filter(r => statusOf(r) === 'active').length
    const totalScans = records.reduce((acc, r) => acc + r.scan_count, 0)
    const soon = records.filter(r => {
      if (!r.end_date) return false
      const days = (new Date(r.end_date).getTime() - Date.now()) / 86400000
      return days >= 0 && days <= 30
    }).length
    return { total, active, totalScans, soon }
  }, [records])

  // QR generation refs
  const qrSvgRef = useRef<HTMLDivElement>(null)
  const url = selected ? targetUrl(selected) : ''

  // ---- Actions ----
  async function copyLink() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    toast.success(t.copied)
  }
  function downloadSvg() {
    const svg = qrSvgRef.current?.querySelector('svg')
    if (!svg || !selected) return
    const data = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
    const a = document.createElement('a')
    const objUrl = URL.createObjectURL(blob)
    a.href = objUrl; a.download = `qr-${selected.id}.svg`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(objUrl)
  }
  function downloadPng() {
    const svg = qrSvgRef.current?.querySelector('svg')
    if (!svg || !selected) return
    const data = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = 720; c.height = 720
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 60, 60, 600, 600)
      const a = document.createElement('a')
      a.href = c.toDataURL('image/png')
      a.download = `qr-${selected.id}.png`
      document.body.appendChild(a); a.click(); a.remove()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)))
  }
  function deleteRecord() {
    if (!selected) return
    if (!confirm(t.deleteConfirm)) return
    setRecords(prev => prev.filter(r => r.id !== selected.id))
    setSelectedId(null)
    toast.success(t.deleted)
  }

  function handleSaveNewQr(rec: QrRecord) {
    setRecords(prev => [rec, ...prev])
    setSelectedId(rec.id)
    setModalOpen(false)
    toast.success(t.saved)
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-5">

      {/* Header */}
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
          <button
            type="button"
            onClick={() => setScanMode(s => !s)}
            className={cn('btn-secondary text-sm', scanMode && 'bg-blue-50 border-blue-300 text-blue-700')}
          >
            <Camera className="w-4 h-4" />
            {scanMode ? t.scannerClose : t.scannerOpen}
          </button>
          <button type="button" onClick={openCreate} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            {t.newQr}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.statTotal,    value: stats.total,     color: 'blue',   icon: QrCodeIcon },
          { label: t.statActive,   value: stats.active,    color: 'green',  icon: CheckCircle },
          { label: t.statScans,    value: stats.totalScans,color: 'purple', icon: Eye },
          { label: t.statExpiring, value: stats.soon,      color: 'orange', icon: AlertTriangle },
        ].map(s => (
          <div
            key={s.label}
            className={cn(
              'premium-card p-4 flex items-center gap-3',
              s.color === 'blue'   && (isRtl ? 'border-r-4 border-r-blue-500'   : 'border-l-4 border-l-blue-500'),
              s.color === 'green'  && (isRtl ? 'border-r-4 border-r-green-500'  : 'border-l-4 border-l-green-500'),
              s.color === 'purple' && (isRtl ? 'border-r-4 border-r-purple-500' : 'border-l-4 border-l-purple-500'),
              s.color === 'orange' && (isRtl ? 'border-r-4 border-r-orange-500' : 'border-l-4 border-l-orange-500'),
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              s.color === 'blue' && 'bg-blue-100',
              s.color === 'green' && 'bg-green-100',
              s.color === 'purple' && 'bg-purple-100',
              s.color === 'orange' && 'bg-orange-100',
            )}>
              <s.icon className={cn(
                'w-5 h-5',
                s.color === 'blue' && 'text-blue-600',
                s.color === 'green' && 'text-green-600',
                s.color === 'purple' && 'text-purple-600',
                s.color === 'orange' && 'text-orange-600',
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Scanner */}
      <AnimatePresence>
        {scanMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="premium-card p-6 overflow-hidden"
          >
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              {t.scannerTitle}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-900 rounded-2xl h-64 flex items-center justify-center relative overflow-hidden">
                <div className="w-40 h-40 relative">
                  <div className="absolute inset-0 border-2 border-white/40 rounded-lg" />
                  <div className="absolute top-0 start-0 w-8 h-8 border-t-2 border-s-2 border-white rounded-ts-lg" />
                  <div className="absolute top-0 end-0   w-8 h-8 border-t-2 border-e-2 border-white rounded-te-lg" />
                  <div className="absolute bottom-0 start-0 w-8 h-8 border-b-2 border-s-2 border-white rounded-bs-lg" />
                  <div className="absolute bottom-0 end-0   w-8 h-8 border-b-2 border-e-2 border-white rounded-be-lg" />
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-0.5 bg-red-500"
                    animate={{ y: [0, 150, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <ol className="text-sm text-gray-600 space-y-2">
                  {[t.scanInstructions1, t.scanInstructions2, t.scanInstructions3, t.scanInstructions4].map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
                {scanResult && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-green-700">{t.scanned}</p>
                      <p className="text-xs text-green-600 truncate">{scanResult}</p>
                    </div>
                  </div>
                )}
                <button type="button" onClick={simulateScan} className="btn-primary w-full text-sm">
                  <Camera className="w-4 h-4" />
                  {t.simulateScan}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
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
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as QrType | 'all')} className="form-input w-auto min-w-[160px]">
          <option value="all">{t.allTypes}</option>
          {(Object.keys(TYPE_LABEL_KEY) as QrType[]).map(k => (
            <option key={k} value={k}>{t[TYPE_LABEL_KEY[k]]}</option>
          ))}
        </select>
        <select value={visFilter} onChange={e => setVisFilter(e.target.value as QrVisibility | 'all')} className="form-input w-auto min-w-[150px]">
          <option value="all">{t.allVisibility}</option>
          <option value="public">{t.visPublic}</option>
          <option value="internal">{t.visInternal}</option>
          <option value="admin">{t.visAdmin}</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as QrStatus | 'all')} className="form-input w-auto min-w-[140px]">
          <option value="all">{t.allStatus}</option>
          <option value="active">{t.statusActive}</option>
          <option value="inactive">{t.statusInactive}</option>
          <option value="expired">{t.statusExpired}</option>
        </select>
      </div>

      {/* Main grid: list + detail */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* List */}
        <div className="lg:col-span-1 premium-card p-3 max-h-[640px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-10">
              <QrCodeIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">{t.none}</p>
              <p className="text-xs text-gray-500 mt-1">{t.noneSub}</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map(r => {
                const TypeIcon = TYPE_ICON[r.type]
                const tint = TYPE_COLOR[r.type]
                const status = statusOf(r)
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        'w-full text-start p-3 rounded-xl border transition-all',
                        selectedId === r.id
                          ? 'bg-blue-50 border-blue-200 shadow-sm'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: tint + '18', color: tint }}
                        >
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">
                            {isRtl && r.title_ar ? r.title_ar : r.title}
                          </p>
                          <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px] text-gray-500">
                            <span className="font-semibold" style={{ color: tint }}>{t[TYPE_LABEL_KEY[r.type]]}</span>
                            <span aria-hidden>·</span>
                            <span className="tabular-nums">{format(t.scanCount, { n: r.scan_count })}</span>
                            {status === 'expired' && (
                              <span className="text-orange-600 font-semibold">· {t.statusExpired}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="premium-card p-12 text-center">
              <QrCodeIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-semibold text-gray-700">{t.select}</p>
              <p className="text-sm text-gray-500 mt-1">{t.selectSub}</p>
            </div>
          ) : (
            <QrDetail
              selected={selected}
              t={t}
              isRtl={isRtl}
              deptById={DEPT_BY_ID}
              targetUrl={url}
              qrRef={qrSvgRef}
              onCopy={copyLink}
              onDownloadSvg={downloadSvg}
              onDownloadPng={downloadPng}
              onDelete={deleteRecord}
              participants={participants[selected.id] || []}
              syncEntry={syncLog[selected.id]}
              syncing={syncingId === selected.id}
              onSync={() => syncFromSheet(selected)}
            />
          )}
        </div>
      </div>

      {/* Recent scans (mocked) */}
      <div className="premium-card p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600" />
          {t.recentScans}
        </h2>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.colTitle}</th>
                <th>{t.colType}</th>
                <th>{t.colVis}</th>
                <th>{t.colScans}</th>
                <th>{t.colStatus}</th>
                <th>{t.colCreated}</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 8).map(r => {
                const status = statusOf(r)
                const TypeIcon = TYPE_ICON[r.type]
                return (
                  <tr key={r.id}>
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelectedId(r.id)}
                        className="text-xs font-medium text-gray-900 hover:text-blue-700 text-start"
                      >
                        {isRtl && r.title_ar ? r.title_ar : r.title}
                      </button>
                    </td>
                    <td>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
                        style={{ background: TYPE_COLOR[r.type] + '18', color: TYPE_COLOR[r.type] }}
                      >
                        <TypeIcon className="w-3 h-3" />
                        {t[TYPE_LABEL_KEY[r.type]]}
                      </span>
                    </td>
                    <td>
                      <VisibilityBadge v={r.visibility} t={t} />
                    </td>
                    <td className="text-xs tabular-nums text-gray-700">{r.scan_count}</td>
                    <td>
                      <StatusBadge s={status} t={t} />
                    </td>
                    <td className="text-xs text-gray-500">{formatDate(r.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New / Edit modal */}
      <AnimatePresence>
        {modalOpen && (
          <NewQrModal
            t={t}
            isRtl={isRtl}
            departments={departments}
            onClose={closeModal}
            onSave={handleSaveNewQr}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// --------------- Detail subcomponent ---------------

function QrDetail({
  selected, t, isRtl, deptById, targetUrl, qrRef,
  onCopy, onDownloadSvg, onDownloadPng, onDelete,
  participants, syncEntry, syncing, onSync,
}: {
  selected: QrRecord
  t: Translations
  isRtl: boolean
  deptById: Map<string, Department>
  targetUrl: string
  qrRef: React.RefObject<HTMLDivElement>
  onCopy: () => void
  onDownloadSvg: () => void
  onDownloadPng: () => void
  onDelete: () => void
  participants: SyncParticipant[]
  syncEntry?: SyncLogEntry
  syncing: boolean
  onSync: () => void
}) {
  const TypeIcon = TYPE_ICON[selected.type]
  const tint = TYPE_COLOR[selected.type]
  const status = statusOf(selected)
  const dept = selected.department_id ? deptById.get(selected.department_id) : undefined

  const periodLabel = (() => {
    if (!selected.start_date && !selected.end_date) return t.activeNow
    if (selected.end_date) return format(t.expiresOn, { date: formatDate(selected.end_date) })
    return t.activeNow
  })()

  return (
    <motion.div
      key={selected.id}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="premium-card p-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: tint + '18', color: tint }}
          >
            <TypeIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 text-lg leading-snug">
              {isRtl && selected.title_ar ? selected.title_ar : selected.title}
            </h2>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
              <span className="font-semibold" style={{ color: tint }}>{t[TYPE_LABEL_KEY[selected.type]]}</span>
              <span aria-hidden className="text-gray-300">·</span>
              <span className="text-gray-500 tabular-nums">{format(t.scanCount, { n: selected.scan_count })}</span>
              <span aria-hidden className="text-gray-300">·</span>
              <StatusBadge s={status} t={t} />
              <VisibilityBadge v={selected.visibility} t={t} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
            title={t.deleteQr}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* QR + metadata side by side */}
      <div className="grid md:grid-cols-2 gap-6 items-start">

        {/* QR */}
        <div className="flex flex-col items-center">
          <div ref={qrRef} className="p-6 bg-white rounded-2xl shadow border border-gray-200">
            {selected.uploaded_image ? (
              <img src={selected.uploaded_image} alt={selected.title} className="w-[220px] h-[220px] object-contain" />
            ) : (
              <QRCode value={targetUrl} size={220} level="H" />
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-3 text-center">{t.targetUrl}</p>
          <p className="font-mono text-[11px] text-gray-700 mt-1 text-center break-all max-w-xs">
            {targetUrl}
          </p>
        </div>

        {/* Metadata */}
        <div className="space-y-4 min-w-0">
          {/* Dept */}
          {dept && (
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t.department}</p>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ background: dept.color + '18', color: dept.color }}
              >
                <Building2 className="w-3.5 h-3.5" />
                {dept.name}
              </span>
            </div>
          )}

          {/* Period */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t.period}</p>
            <p className="text-sm text-gray-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {periodLabel}
            </p>
          </div>

          {/* Linked sources */}
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t.linkedSources}</p>
            <ul className="space-y-1.5">
              {selected.registration_url && (
                <LinkRow icon={ExternalLink} label={t.registrationUrl} value={selected.registration_url} color="#2563eb" />
              )}
              {selected.google_form_url && (
                <LinkRow icon={FileText} label={t.googleForm} value={selected.google_form_url} color="#7c3aed" />
              )}
              {selected.google_sheet_url && (
                <LinkRow icon={FileSpreadsheet} label={t.googleSheet} value={selected.google_sheet_url} color="#16a34a" />
              )}
              {selected.google_drive_url && (
                <LinkRow icon={FolderOpen} label={t.googleDrive} value={selected.google_drive_url} color="#f59e0b" />
              )}
              {!selected.registration_url && !selected.google_form_url && !selected.google_sheet_url && !selected.google_drive_url && (
                <li className="text-xs text-gray-400">—</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Actions row */}
      <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-2">
        <button type="button" onClick={onDownloadSvg} className="btn-secondary text-sm">
          <Download className="w-4 h-4" />
          {t.downloadSvg}
        </button>
        <button type="button" onClick={onDownloadPng} className="btn-secondary text-sm">
          <Download className="w-4 h-4" />
          {t.downloadPng}
        </button>
        <button type="button" onClick={() => window.print()} className="btn-secondary text-sm">
          <Printer className="w-4 h-4" />
          {t.print}
        </button>
        <button type="button" onClick={onCopy} className="btn-secondary text-sm">
          <Copy className="w-4 h-4" />
          {t.copyLink}
        </button>
        <button type="button" onClick={() => toast.success('Regenerated')} className="btn-secondary text-sm">
          <RefreshCw className="w-4 h-4" />
          Regenerate
        </button>
      </div>

      {/* ============ Google Sheet sync ============ */}
      <div className="mt-6 pt-5 border-t border-gray-100">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{t.syncTitle}</h3>
              {selected.google_sheet_url ? (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {syncEntry?.at
                    ? format(t.syncLast, { when: timeAgo(syncEntry.at) })
                    : t.syncNever}
                </p>
              ) : (
                <p className="text-[11px] text-amber-700 mt-0.5">{t.syncNoSheet}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onSync}
            disabled={!selected.google_sheet_url || syncing}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors',
              !selected.google_sheet_url
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : syncing
                ? 'bg-blue-500/70 text-white cursor-wait'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
            )}
          >
            {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? t.syncing : t.syncBtn}
          </button>
        </div>

        {/* Sync error */}
        {syncEntry?.error && (
          <div className="rounded-xl p-3 text-xs mb-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <p className="font-bold text-red-700 inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t.syncError}
            </p>
            <p className="text-red-700 mt-1 leading-relaxed">{syncEntry.error}</p>
          </div>
        )}

        {/* Synced participants summary */}
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 text-xs">
            <span className="font-bold text-gray-700 inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gray-500" />
              {t.syncedParticipants}
            </span>
            <span className="text-gray-500 tabular-nums">{participants.length}</span>
          </div>
          {participants.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">{t.syncedNone}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t.syncedCol1}</th>
                    <th>{t.syncedCol2}</th>
                    <th>{t.syncedCol3}</th>
                    <th>{t.syncedCol4}</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.slice(0, 8).map(p => (
                    <tr key={p.id}>
                      <td className="text-xs">{p.full_name || '—'}</td>
                      <td className="text-[11px] font-mono text-gray-700">{p.email || '—'}</td>
                      <td className="text-xs">{p.department || '—'}</td>
                      <td className="text-[11px] text-gray-500">{p.registered_at || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function LinkRow({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string; value: string; color: string
}) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
      <span className="font-semibold text-gray-600 flex-shrink-0">{label}:</span>
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-700 hover:underline truncate min-w-0"
      >
        {value}
      </a>
    </li>
  )
}

function StatusBadge({ s, t }: { s: QrStatus; t: Translations }) {
  const cls =
    s === 'active' ? 'bg-green-100 text-green-700 border-green-200'
    : s === 'expired' ? 'bg-orange-100 text-orange-700 border-orange-200'
    : 'bg-gray-100 text-gray-700 border-gray-200'
  const label = s === 'active' ? t.statusActive : s === 'expired' ? t.statusExpired : t.statusInactive
  return <span className={cn('badge text-[10px]', cls)}>{label}</span>
}

function VisibilityBadge({ v, t }: { v: QrVisibility; t: Translations }) {
  const map = {
    public:   { cls: 'bg-blue-100 text-blue-700 border-blue-200',   icon: Globe, label: t.visPublic },
    internal: { cls: 'bg-purple-100 text-purple-700 border-purple-200', icon: Users, label: t.visInternal },
    admin:    { cls: 'bg-rose-100 text-rose-700 border-rose-200',   icon: Lock,  label: t.visAdmin },
  } as const
  const { cls, icon: Icon, label } = map[v]
  return (
    <span className={cn('badge text-[10px] inline-flex items-center gap-1', cls)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

// --------------- New QR Modal ---------------

function NewQrModal({
  t, isRtl, departments, onClose, onSave,
}: {
  t: Translations
  isRtl: boolean
  departments: Department[]
  onClose: () => void
  onSave: (rec: QrRecord) => void
}) {
  const [title, setTitle] = useState('')
  const [titleAr, setTitleAr] = useState('')
  const [type, setType] = useState<QrType>('workshop')
  const [related, setRelated] = useState('')
  const [departmentId, setDepartmentId] = useState<string>('')
  const [registrationUrl, setRegistrationUrl] = useState('')
  const [googleForm, setGoogleForm] = useState('')
  const [googleSheet, setGoogleSheet] = useState('')
  const [googleDrive, setGoogleDrive] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [visibility, setVisibility] = useState<QrVisibility>('internal')
  const [uploadedImage, setUploadedImage] = useState<string>('')
  const [saving, setSaving] = useState(false)

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      toast.error('File too large (max 500 KB)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setUploadedImage(typeof reader.result === 'string' ? reader.result : '')
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!title.trim()) { toast.error(t.requiredTitle); return }
    const hasUrl = registrationUrl || googleForm || googleSheet || googleDrive
    if (!hasUrl && !uploadedImage) { toast.error(t.requiredTarget); return }

    setSaving(true)
    await new Promise(r => setTimeout(r, 250))
    const rec: QrRecord = {
      id: `qr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      title_ar: titleAr.trim() || undefined,
      type,
      related_label: related.trim() || undefined,
      department_id: departmentId || undefined,
      registration_url: registrationUrl.trim() || undefined,
      google_form_url: googleForm.trim() || undefined,
      google_sheet_url: googleSheet.trim() || undefined,
      google_drive_url: googleDrive.trim() || undefined,
      uploaded_image: uploadedImage || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      visibility,
      scan_count: 0,
      created_at: new Date().toISOString(),
    }
    onSave(rec)
    setSaving(false)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40"
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <QrCodeIcon className="w-5 h-5 text-blue-600" />
              {t.modalAddTitle}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.fldTitle} required>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="form-input" autoFocus />
              </Field>
              <Field label={t.fldTitleAr}>
                <input type="text" dir="rtl" value={titleAr} onChange={e => setTitleAr(e.target.value)} className="form-input" />
              </Field>
            </div>

            <Field label={t.fldType}>
              <select value={type} onChange={e => setType(e.target.value as QrType)} className="form-input">
                {(Object.keys(TYPE_LABEL_KEY) as QrType[]).map(k => (
                  <option key={k} value={k}>{t[TYPE_LABEL_KEY[k]]}</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">{t.pickQrType}</p>
            </Field>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.fldRelated}>
                <input
                  type="text"
                  value={related}
                  onChange={e => setRelated(e.target.value)}
                  className="form-input"
                  placeholder={t.fldRelatedPh}
                />
              </Field>
              <Field label={t.fldDept}>
                <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="form-input">
                  <option value="">—</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label={t.fldRegistrationUrl}>
              <input
                type="url"
                value={registrationUrl}
                onChange={e => setRegistrationUrl(e.target.value)}
                placeholder={t.fldRegistrationUrlPh}
                className="form-input"
                dir="ltr"
              />
            </Field>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.fldGoogleForm}>
                <input type="url" value={googleForm} onChange={e => setGoogleForm(e.target.value)} placeholder="https://forms.gle/…" className="form-input" dir="ltr" />
              </Field>
              <Field label={t.fldGoogleSheet}>
                <input type="url" value={googleSheet} onChange={e => setGoogleSheet(e.target.value)} placeholder="https://docs.google.com/spreadsheets/…" className="form-input" dir="ltr" />
              </Field>
            </div>

            <Field label={t.fldGoogleDrive}>
              <input type="url" value={googleDrive} onChange={e => setGoogleDrive(e.target.value)} placeholder="https://drive.google.com/…" className="form-input" dir="ltr" />
            </Field>

            <div className="grid md:grid-cols-3 gap-4">
              <Field label={t.fldStart}>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input" />
              </Field>
              <Field label={t.fldEnd}>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input" />
              </Field>
              <Field label={t.fldVisibility}>
                <select value={visibility} onChange={e => setVisibility(e.target.value as QrVisibility)} className="form-input">
                  <option value="public">{t.visPublic}</option>
                  <option value="internal">{t.visInternal}</option>
                  <option value="admin">{t.visAdmin}</option>
                </select>
              </Field>
            </div>

            <Field label={t.fldUpload}>
              <label className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 cursor-pointer transition-colors">
                {uploadedImage ? (
                  <>
                    <img src={uploadedImage} alt="" className="w-12 h-12 object-contain rounded" />
                    <div className="text-xs">
                      <p className="font-semibold text-green-700">Image attached</p>
                      <p className="text-gray-500">Click to replace</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Upload className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-gray-700">{t.upload}</p>
                      <p className="text-gray-400">{t.fldUploadHint}</p>
                    </div>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </label>
            </Field>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">
              {t.cancel}
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? t.saving : t.save}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span className="text-red-500 ms-1">*</span>}
      </label>
      {children}
    </div>
  )
}
