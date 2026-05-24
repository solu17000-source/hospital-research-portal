'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  AlertTriangle, ArrowLeft, ArrowRight, CheckCircle, CloudUpload, Download,
  FileSpreadsheet, Languages, RefreshCw, Sparkles, X,
} from 'lucide-react'

import { createResearchBulk, type ResearchInput, type BulkResult } from '@/lib/data-source'
import { DEMO_DEPARTMENTS } from '@/lib/demo-data'
import { useLang } from '@/lib/i18n'
import { isDemoMode } from '@/lib/supabase'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import type {
  ApprovalStatus, JournalQuartile, IndexedDatabase, PriorityLevel,
  PublicationStatus, ResearchStatus, WorkflowStage,
} from '@/types'

// ============================================================
// Column-mapping
// ============================================================

/** All importable schema fields. Used both for column auto-detect and the
 *  per-column dropdown override. */
type Field =
  | 'ignore'
  | 'title'           | 'title_ar'           | 'abstract'
  | 'keywords'        | 'research_category'
  | 'department'      | 'principal_investigator_name'
  | 'start_date'      | 'expected_completion_date'
  | 'status'          | 'workflow_stage'      | 'priority_level'
  | 'irb_approval_status' | 'irb_approval_number'
  | 'funding_source'  | 'budget'              | 'budget_currency'
  | 'publication_status' | 'journal_name'     | 'journal_quartile'
  | 'doi'             | 'notes'               | 'is_public'

const FIELD_LABEL: Record<Field, string> = {
  ignore: '— ignore —',
  title: 'Title (required)',
  title_ar: 'Arabic title',
  abstract: 'Abstract',
  keywords: 'Keywords (comma-separated)',
  research_category: 'Category',
  department: 'Department (name or code)',
  principal_investigator_name: 'Principal investigator',
  start_date: 'Start date',
  expected_completion_date: 'Expected completion date',
  status: 'Status',
  workflow_stage: 'Workflow stage',
  priority_level: 'Priority',
  irb_approval_status: 'IRB approval status',
  irb_approval_number: 'IRB number',
  funding_source: 'Funding source',
  budget: 'Budget',
  budget_currency: 'Currency',
  publication_status: 'Publication status',
  journal_name: 'Journal name',
  journal_quartile: 'Quartile (Q1/Q2/Q3/Q4)',
  doi: 'DOI',
  notes: 'Notes',
  is_public: 'Public (true/false)',
}

/** Header → Field heuristic. Case-insensitive, accent-tolerant, EN + AR. */
function autoDetect(header: string): Field {
  const h = header.trim().toLowerCase()
  if (!h) return 'ignore'
  // Order matters — more specific match first.
  if (/title.*ar|arabic.*title|عنوان.*عرب/.test(h)) return 'title_ar'
  if (/^title|research.*title|project.*title|^العنوان$/.test(h)) return 'title'
  if (/abstract|summary|الملخص/.test(h)) return 'abstract'
  if (/keyword|tag|كلمات/.test(h)) return 'keywords'
  if (/category|research.*type|تصنيف/.test(h)) return 'research_category'
  if (/dept|department|قسم/.test(h)) return 'department'
  if (/principal.*investig|^pi$|الباحث|investigator/.test(h)) return 'principal_investigator_name'
  if (/start.*date|تاريخ.*بداية/.test(h)) return 'start_date'
  if (/expected.*complet|completion.*date|end.*date|انتهاء/.test(h)) return 'expected_completion_date'
  if (/workflow|stage|مرحلة/.test(h)) return 'workflow_stage'
  if (/priority|أولوية/.test(h)) return 'priority_level'
  if (/irb.*number|irb.*#/.test(h)) return 'irb_approval_number'
  if (/irb|ethics.*approval|approval.*status/.test(h)) return 'irb_approval_status'
  if (/funding|sponsor|funder|تمويل/.test(h)) return 'funding_source'
  if (/budget|amount|ميزانية/.test(h)) return 'budget'
  if (/currency|عملة/.test(h)) return 'budget_currency'
  if (/publication.*status|نشر/.test(h)) return 'publication_status'
  if (/journal.*name|^journal$/.test(h)) return 'journal_name'
  if (/quartile|^q[1-4]?$/.test(h)) return 'journal_quartile'
  if (/^doi$/.test(h)) return 'doi'
  if (/notes|comment|ملاحظات/.test(h)) return 'notes'
  if (/public|is.public|عام/.test(h)) return 'is_public'
  if (/status|الحالة/.test(h)) return 'status'
  return 'ignore'
}

// ============================================================
// Value coercion
// ============================================================

/** Best-effort date parser: supports ISO, DD/MM/YYYY, MM/DD/YYYY, Excel serial. */
function coerceDate(v: unknown): string | undefined {
  if (v == null || v === '') return undefined
  if (typeof v === 'number') {
    // Excel serial date (days since 1899-12-30, UTC).
    const ms = (v - 25569) * 86400 * 1000
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  if (!s) return undefined
  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  // DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY — disambiguate via "> 12" hint.
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (m) {
    let [, a, b, y] = m
    const yyyy = y.length === 2 ? `20${y}` : y
    const isDmy = parseInt(a, 10) > 12
    const dd = isDmy ? a.padStart(2, '0') : b.padStart(2, '0')
    const mm = isDmy ? b.padStart(2, '0') : a.padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10)
}

function coerceBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  return /^(true|yes|y|1|✓|نعم)$/i.test(String(v ?? '').trim())
}
function coerceNumber(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  if (typeof v === 'number') return v
  const n = Number(String(v).replace(/[, ]/g, ''))
  return Number.isFinite(n) ? n : undefined
}
function coerceEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  const s = String(v ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const hit = allowed.find(a => a.toLowerCase() === s)
  return hit ?? fallback
}

const STATUS_VALUES = ['active', 'completed', 'delayed', 'cancelled', 'on_hold', 'pending_approval'] as const
const WORKFLOW_VALUES = [
  'idea_submitted', 'proposal_drafted', 'department_approval', 'ethics_irb_approval',
  'data_collection', 'data_analysis', 'manuscript_writing', 'journal_submission',
  'revision', 'accepted', 'published',
] as const
const PRIORITY_VALUES = ['low', 'medium', 'high', 'critical'] as const
const APPROVAL_VALUES = ['pending', 'approved', 'rejected', 'not_required'] as const
const PUBLICATION_VALUES = [
  'not_submitted', 'submitted', 'under_review', 'revision_requested',
  'accepted', 'published', 'rejected',
] as const
const QUARTILE_VALUES = ['Q1', 'Q2', 'Q3', 'Q4', 'not_indexed'] as const

function resolveDepartmentId(label: string): string | undefined {
  const s = label.trim().toLowerCase()
  if (!s) return undefined
  const hit = DEMO_DEPARTMENTS.find(d =>
    d.name.toLowerCase() === s
    || d.code.toLowerCase() === s
    || s.includes(d.code.toLowerCase())
    || d.name.toLowerCase().includes(s),
  )
  return hit?.id
}

// ============================================================
// Row → ResearchInput projection
// ============================================================

type RawRow = Record<string, unknown>

type ParsedRow = {
  index: number  // 1-based excluding header
  input: ResearchInput
  errors: string[]
  warnings: string[]
}

function projectRow(raw: RawRow, mapping: Record<string, Field>, rowIndex: number, userId?: string): ParsedRow {
  const input: ResearchInput = { title: '' }
  const errors: string[] = []
  const warnings: string[] = []
  input.created_by = userId

  for (const [header, field] of Object.entries(mapping)) {
    if (field === 'ignore') continue
    const value = raw[header]
    if (value == null || value === '') continue
    switch (field) {
      case 'title':                input.title = String(value).trim(); break
      case 'title_ar':             input.title_ar = String(value).trim(); break
      case 'abstract':             input.abstract = String(value).trim(); break
      case 'keywords':             input.keywords = String(value).split(/[,،;|]/).map(k => k.trim()).filter(Boolean); break
      case 'research_category':    input.research_category = String(value).trim(); break
      case 'department': {
        const id = resolveDepartmentId(String(value))
        if (id) input.department_id = id
        else warnings.push(`Unknown department "${value}" — left unset.`)
        break
      }
      case 'principal_investigator_name': input.principal_investigator_name = String(value).trim(); break
      case 'start_date': {
        const d = coerceDate(value)
        if (d) input.start_date = d
        else warnings.push(`Unrecognized start_date "${value}".`)
        break
      }
      case 'expected_completion_date': {
        const d = coerceDate(value)
        if (d) input.expected_completion_date = d
        else warnings.push(`Unrecognized expected_completion_date "${value}".`)
        break
      }
      case 'status':                input.status = coerceEnum(value, STATUS_VALUES, 'active') as ResearchStatus; break
      case 'workflow_stage':        input.workflow_stage = coerceEnum(value, WORKFLOW_VALUES, 'idea_submitted') as WorkflowStage; break
      case 'priority_level':        input.priority_level = coerceEnum(value, PRIORITY_VALUES, 'medium') as PriorityLevel; break
      case 'irb_approval_status':   input.irb_approval_status = coerceEnum(value, APPROVAL_VALUES, 'pending') as ApprovalStatus; break
      case 'irb_approval_number':   input.irb_approval_number = String(value).trim(); break
      case 'funding_source':        input.funding_source = String(value).trim(); break
      case 'budget':                input.budget = coerceNumber(value); break
      case 'budget_currency':       input.budget_currency = String(value).trim().toUpperCase(); break
      case 'publication_status':    input.publication_status = coerceEnum(value, PUBLICATION_VALUES, 'not_submitted') as PublicationStatus; break
      case 'journal_name':          input.journal_name = String(value).trim(); break
      case 'journal_quartile':      input.journal_quartile = coerceEnum(value.toString().toUpperCase().replace(' ', ''), QUARTILE_VALUES, 'not_indexed') as JournalQuartile; break
      case 'doi':                   input.doi = String(value).trim(); break
      case 'notes':                 input.notes = String(value).trim(); break
      case 'is_public':             input.is_public = coerceBool(value); break
    }
  }

  if (!input.title) errors.push('Missing title')

  return { index: rowIndex, input, errors, warnings }
}

// ============================================================
// Translations
// ============================================================

const DICT = {
  en: {
    backToResearch: 'Back to research',
    pageTitle: 'Bulk import research',
    pageSub: 'Upload an Excel or CSV file. Columns are auto-mapped; review and commit to write to the database.',
    languageBtn: 'العربية',
    liveData: 'Writes go to Supabase',
    demoData: 'Demo mode — rows are stored locally and appear in dashboard & list immediately',
    pickFile: 'Drag a file here, or click to choose',
    pickHint: '.xlsx, .xls, .csv — first row must be column headers',
    downloadTemplate: 'Download template',
    parsing: 'Parsing…',
    parsed: 'Parsed {n} rows from "{sheet}"',
    reparse: 'Choose a different file',
    mappingTitle: 'Column mapping',
    mappingHint: 'We tried to guess each column — fix anything that looks off before importing.',
    previewTitle: 'Preview (first 10 rows)',
    validationOk: 'All {n} rows look good — ready to import.',
    validationErrors: '{n} rows have errors — fix the file and reupload, or import only the {ok} valid rows below.',
    importBtn: 'Import {n} rows',
    importing: 'Importing…',
    importDone: 'Imported {ok} rows. {failed} failed.',
    resultsTitle: 'Import results',
    seeResearch: 'Open Research Database',
    importAnother: 'Import another file',
    errorsTitle: 'Errors',
    errCol: 'Row',
    errMsg: 'Error',
    errTitle: 'Title',
  },
  ar: {
    backToResearch: 'العودة إلى الأبحاث',
    pageTitle: 'الاستيراد المجمّع للأبحاث',
    pageSub: 'ارفع ملف Excel أو CSV. سيتم تخطيط الأعمدة تلقائيًا — راجع ثم نفّذ الإدراج في قاعدة البيانات.',
    languageBtn: 'English',
    liveData: 'يتم الإدراج في Supabase',
    demoData: 'الوضع التجريبي — يتم تخزين الصفوف محليًا وتظهر فورًا في لوحة التحكم والقائمة',
    pickFile: 'اسحب ملفًا هنا، أو اضغط للاختيار',
    pickHint: '.xlsx, .xls, .csv — الصف الأول يجب أن يكون رؤوس الأعمدة',
    downloadTemplate: 'تنزيل قالب',
    parsing: 'جاري التحليل…',
    parsed: 'تم تحليل {n} صف من "{sheet}"',
    reparse: 'اختيار ملف آخر',
    mappingTitle: 'تخطيط الأعمدة',
    mappingHint: 'حاولنا تخمين كل عمود — صحّح أي خطأ قبل الاستيراد.',
    previewTitle: 'معاينة (أول 10 صفوف)',
    validationOk: 'جميع الصفوف الـ {n} جاهزة للاستيراد.',
    validationErrors: '{n} صفوف بها أخطاء — صحّح الملف وأعد رفعه، أو استورد فقط الصفوف الصحيحة وعددها {ok}.',
    importBtn: 'استيراد {n} صف',
    importing: 'جاري الاستيراد…',
    importDone: 'تم استيراد {ok} صف. {failed} فشل.',
    resultsTitle: 'نتائج الاستيراد',
    seeResearch: 'فتح قاعدة بيانات الأبحاث',
    importAnother: 'استيراد ملف آخر',
    errorsTitle: 'الأخطاء',
    errCol: 'الصف',
    errMsg: 'الخطأ',
    errTitle: 'العنوان',
  },
} as const

function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

// ============================================================
// Page
// ============================================================

type Stage = 'idle' | 'parsed' | 'committed'

export default function ImportResearchPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { lang, isRtl, toggle, t } = useLang(DICT)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<Stage>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const [sheetName, setSheetName] = useState<string>('')
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, Field>>({})
  const [result, setResult] = useState<BulkResult | null>(null)

  const parsedRows = useMemo<ParsedRow[]>(() => {
    if (!rawRows.length || !headers.length) return []
    return rawRows.map((raw, i) => projectRow(raw, mapping, i + 2, user?.id))
  }, [rawRows, headers, mapping, user?.id])

  const errorCount = parsedRows.filter(r => r.errors.length).length
  const okCount = parsedRows.length - errorCount

  // ---------- File parsing ----------
  const parseFile = useCallback(async (file: File) => {
    setIsParsing(true)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: false })
      const firstSheet = wb.SheetNames[0]
      const ws = wb.Sheets[firstSheet]
      if (!ws) throw new Error('No sheet found in file.')

      const rows: RawRow[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true })
      if (rows.length === 0) throw new Error('Sheet is empty.')

      const headerList = Object.keys(rows[0])
      const initialMapping: Record<string, Field> = {}
      headerList.forEach(h => { initialMapping[h] = autoDetect(h) })

      setSheetName(firstSheet)
      setRawRows(rows)
      setHeaders(headerList)
      setMapping(initialMapping)
      setStage('parsed')
      toast.success(format(t.parsed, { n: rows.length, sheet: firstSheet }))
    } catch (e) {
      toast.error(`Could not parse file: ${(e as Error).message}`)
    } finally {
      setIsParsing(false)
    }
  }, [t])

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void parseFile(file)
    e.target.value = ''
  }
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void parseFile(file)
  }

  // ---------- Template ----------
  async function downloadTemplate() {
    const XLSX = await import('xlsx')
    const sample = [
      {
        Title: 'Sample research title',
        'Title (AR)': 'العنوان بالعربية',
        Abstract: 'One-paragraph summary of the project',
        Keywords: 'nursing, icu, hypertension',
        Category: 'Clinical Research',
        Department: 'Internal Medicine',
        'Principal Investigator': 'Dr. Full Name',
        'Start Date': '2026-06-01',
        'Expected Completion Date': '2027-06-01',
        Status: 'active',
        'Workflow Stage': 'idea_submitted',
        Priority: 'medium',
        'IRB Status': 'pending',
        'Funding Source': 'Ministry of Health',
        Budget: 50000,
        'Publication Status': 'not_submitted',
        'Journal Name': '',
        Quartile: 'not_indexed',
        DOI: '',
        Notes: '',
        Public: false,
      },
    ]
    const ws = XLSX.utils.json_to_sheet(sample)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Research')
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'pmnh-research-import-template.xlsx'
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(a.href)
  }

  // ---------- Commit ----------
  async function commit() {
    const validInputs = parsedRows.filter(r => r.errors.length === 0).map(r => r.input)
    if (validInputs.length === 0) { toast.error('No valid rows to import.'); return }
    setIsImporting(true)
    const r = await createResearchBulk(validInputs)
    setIsImporting(false)
    setResult(r)
    setStage('committed')
    toast.success(format(t.importDone, { ok: r.ok, failed: r.failed }))
  }

  function reset() {
    setStage('idle'); setRawRows([]); setHeaders([]); setMapping({}); setResult(null); setSheetName('')
  }

  // ---------- Render ----------
  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link href="/research"
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all">
            <ArrowLeft className={cn('w-5 h-5', isRtl && 'flip-rtl')} />
          </Link>
          <div>
            <h1 className="page-title flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={toggle} className="btn-secondary text-sm">
            <Languages className="w-4 h-4" />{t.languageBtn}
          </button>
          <button type="button" onClick={downloadTemplate} className="btn-secondary text-sm">
            <Download className="w-4 h-4" />
            {t.downloadTemplate}
          </button>
        </div>
      </div>

      {/* ===== Idle: drop zone ===== */}
      {stage === 'idle' && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') fileInputRef.current?.click() }}
          className={cn(
            'rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all select-none',
            isDragging ? 'border-blue-400 bg-blue-50/70' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50',
          )}
        >
          <CloudUpload className={cn('w-14 h-14 mx-auto mb-4', isDragging ? 'text-blue-500' : 'text-gray-300')} />
          <p className={cn('font-semibold text-base', isDragging ? 'text-blue-700' : 'text-gray-700')}>
            {isParsing ? t.parsing : t.pickFile}
          </p>
          <p className="text-xs text-gray-400 mt-1">{t.pickHint}</p>
          <input
            ref={fileInputRef} type="file" className="hidden"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            onChange={onFile}
          />
        </div>
      )}

      {/* ===== Parsed: mapping + preview + commit ===== */}
      {stage === 'parsed' && (
        <>
          <div className="premium-card p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {format(t.parsed, { n: rawRows.length, sheet: sheetName })}
                </p>
                <p className="text-[11px] text-gray-500">{headers.length} columns detected</p>
              </div>
            </div>
            <button type="button" onClick={reset} className="btn-secondary text-xs">
              <RefreshCw className="w-3.5 h-3.5" />{t.reparse}
            </button>
          </div>

          {/* Mapping */}
          <div className="premium-card p-5">
            <h2 className="font-bold text-gray-900">{t.mappingTitle}</h2>
            <p className="text-xs text-gray-500 mt-1 mb-4">{t.mappingHint}</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {headers.map(h => (
                <div key={h} className="rounded-xl border border-gray-100 p-3">
                  <p className="text-[11px] text-gray-500 mb-1 truncate" title={h}>{h}</p>
                  <select
                    value={mapping[h]}
                    onChange={e => setMapping(m => ({ ...m, [h]: e.target.value as Field }))}
                    className="form-input text-xs py-1.5"
                  >
                    {(Object.keys(FIELD_LABEL) as Field[]).map(f => (
                      <option key={f} value={f}>{FIELD_LABEL[f]}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Validation summary */}
          <div className={cn(
            'rounded-2xl border p-4 flex items-start gap-3',
            errorCount === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200',
          )}>
            {errorCount === 0
              ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              : <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
            <div className="text-sm">
              <p className={cn('font-semibold', errorCount === 0 ? 'text-emerald-800' : 'text-amber-800')}>
                {errorCount === 0
                  ? format(t.validationOk, { n: parsedRows.length })
                  : format(t.validationErrors, { n: errorCount, ok: okCount })}
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="premium-card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-sm">{t.previewTitle}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-12 text-center">#</th>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 10).map(r => (
                    <tr key={r.index}>
                      <td className="text-center text-xs text-gray-500 tabular-nums">{r.index}</td>
                      <td>
                        <p className={cn(
                          'text-xs font-semibold truncate max-w-[260px]',
                          r.errors.length ? 'text-red-700' : 'text-gray-900',
                        )}>
                          {r.input.title || <em className="text-red-600">— missing —</em>}
                        </p>
                      </td>
                      <td className="text-xs text-gray-600">
                        {r.input.department_id
                          ? DEMO_DEPARTMENTS.find(d => d.id === r.input.department_id)?.name
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td>
                        <span className="text-[11px] text-gray-700">{r.input.status ?? 'active'}</span>
                      </td>
                      <td>
                        {r.errors.length === 0 && r.warnings.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                            <CheckCircle className="w-3 h-3" /> OK
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            {r.errors.map((e, i) => (
                              <p key={`e${i}`} className="text-[11px] text-red-700 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />{e}
                              </p>
                            ))}
                            {r.warnings.map((w, i) => (
                              <p key={`w${i}`} className="text-[11px] text-amber-700">⚠ {w}</p>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 10 && (
              <div className="px-4 py-2 text-[11px] text-gray-400 text-center border-t border-gray-100">
                + {parsedRows.length - 10} more rows
              </div>
            )}
          </div>

          {/* Commit */}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={reset} className="btn-secondary text-sm">{t.reparse}</button>
            <button
              type="button"
              onClick={commit}
              disabled={isImporting || okCount === 0}
              className="btn-primary text-sm"
            >
              {isImporting ? <Sparkles className="w-4 h-4 animate-pulse" /> : <ArrowRight className={cn('w-4 h-4', isRtl && 'flip-rtl')} />}
              {isImporting ? t.importing : format(t.importBtn, { n: okCount })}
            </button>
          </div>
        </>
      )}

      {/* ===== Committed: results ===== */}
      {stage === 'committed' && result && (
        <div className="premium-card p-6 space-y-5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{t.resultsTitle}</h2>
            <p className="text-sm text-gray-600 mt-1">{format(t.importDone, { ok: result.ok, failed: result.failed })}</p>
          </div>

          {result.errors.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-2 inline-flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                {t.errorsTitle}
              </h3>
              <div className="rounded-xl border border-amber-100 overflow-hidden">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-16 text-center">{t.errCol}</th>
                      <th>{t.errTitle}</th>
                      <th>{t.errMsg}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="text-center text-xs tabular-nums text-gray-500">{e.row || '—'}</td>
                        <td className="text-xs text-gray-700 truncate max-w-[260px]">{e.title || '—'}</td>
                        <td className="text-xs text-red-700">{e.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={reset} className="btn-secondary text-sm">
              <RefreshCw className="w-4 h-4" />{t.importAnother}
            </button>
            <button type="button" onClick={() => router.push('/research')} className="btn-primary text-sm">
              <ArrowRight className={cn('w-4 h-4', isRtl && 'flip-rtl')} />
              {t.seeResearch}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
