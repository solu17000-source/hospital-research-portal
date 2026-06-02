'use client'

/**
 * Real report generation.
 *
 * Each `generate*` helper builds a structured `ReportData` from the seed
 * data, then renders an actual file (PDF / DOCX / XLSX / CSV / PPTX) and
 * returns a Blob the caller can stream to the user's downloads folder.
 *
 * Heavy dependencies (jspdf, docx, xlsx, pptxgenjs) are loaded dynamically
 * so the dashboard page doesn't pay their cost on first paint.
 */

import { ROLE_LABELS, WORKFLOW_STAGES } from '@/types'
import type {
  DashboardStats, Department, Profile, ResearchProject,
} from '@/types'

// The report generator used to read hand-written seed arrays directly from
// `demo-data.ts`. That module was deleted as part of the production cut-over —
// every collection now lives in Supabase and is fetched through hooks in
// `data-source.ts`. Until the report pipeline is rewritten to receive live
// data via parameters, these local empty stubs preserve the original
// signatures so the reports module continues to type-check and render an
// honest "no data" report instead of fabricated demo numbers.
const RESEARCH_DATA: ResearchProject[] = []
const DEPARTMENTS_DATA: Department[] = []
const USERS_DATA: Profile[] = []
const STATS_DATA: DashboardStats = {
  total_projects: 0, active_projects: 0, completed_projects: 0,
  published_papers: 0, delayed_projects: 0, pending_irb: 0,
  upcoming_deadlines: 0, total_departments: 0, total_users: 0,
  this_month_new: 0, funded_projects: 0, total_budget: 0,
  q1_publications: 0, q2_publications: 0, q3_publications: 0,
  q4_publications: 0, open_access_count: 0,
}
const MONTHLY_RESEARCH_DATA: { month: string; new: number; completed: number; published: number }[] = []

// ============================================================
// Public types
// ============================================================

export type ReportTemplateId =
  | 'general'      | 'department' | 'annual'      | 'monthly'
  | 'publication'  | 'delayed'    | 'irb'         | 'budget'
  | 'staff'        | 'journal'    | 'visitor'

export type ReportFormat = 'PDF' | 'Excel' | 'CSV' | 'Word' | 'PowerPoint'

export type ReportFilters = {
  dateFrom?: string
  dateTo?: string
  departmentId?: string // 'all' or department id
}

export type ReportContext = {
  templateId: ReportTemplateId
  templateName: string
  filters: ReportFilters
  generatedAt: Date
  /** Name of the user triggering the report (for the footer). */
  generatedBy?: string
}

export type ReportData = {
  title: string
  templateId: ReportTemplateId
  subtitle: string
  hospital: {
    name: string
    nameAr: string
    unit: string
    location: string
  }
  generatedAt: string
  generatedBy: string
  filters: { label: string; value: string }[]
  kpis: { label: string; value: string; sub?: string }[]
  table: { headers: string[]; rows: string[][] }
  notes: string[]
  footer: string
}

// ============================================================
// Constants
// ============================================================

const HOSPITAL = {
  name: 'Prince Mohammed Bin Nasser Hospital',
  nameAr: 'مستشفى الأمير محمد بن ناصر',
  unit: 'Health & Nursing Research Unit',
  location: 'Jazan, Kingdom of Saudi Arabia',
}

const COLORS = {
  brand:    [14, 124, 102] as [number, number, number],   // #0e7c66
  navy:     [15, 36, 96]   as [number, number, number],   // #0f2460
  blueDeep: [29, 78, 216]  as [number, number, number],   // #1d4ed8
  rule:     [203, 213, 225] as [number, number, number],  // slate-300
  text:     [30, 41, 59]   as [number, number, number],   // slate-800
  muted:    [100, 116, 139] as [number, number, number],  // slate-500
  rowEven:  [241, 245, 249] as [number, number, number],  // slate-100
  white:    [255, 255, 255] as [number, number, number],
}

// ============================================================
// Logo loader (cached, format-aware)
// ============================================================

/**
 * Format flag we propagate to each renderer. jsPDF uses upper-case strings,
 * docx uses lower-case strings, pptxgenjs reads the data-URL MIME for itself.
 */
type LogoData = {
  dataUrl: string          // e.g. "data:image/jpeg;base64,…"
  bytes: Uint8Array
  format: 'PNG' | 'JPEG'
  width: number
  height: number
}

let _logoPromise: Promise<LogoData | null> | null = null

function detectFormat(bytes: Uint8Array): 'PNG' | 'JPEG' | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'PNG'   // 89 50 4e 47 → PNG
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'JPEG'  // ff d8       → JPEG
  return null
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Resolve the institutional logo's intrinsic pixel dimensions so we can size
 * it correctly in each export without distorting the aspect ratio. We use a
 * detached <img>, not the DOM-mounted one, so this works inside a worker-ish
 * non-rendered call.
 */
async function imageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = dataUrl
  })
}

async function loadLogo(): Promise<LogoData | null> {
  if (_logoPromise) return _logoPromise
  _logoPromise = (async () => {
    if (typeof window === 'undefined') return null
    try {
      const resp = await fetch('/jazan-health-cluster.jpg', { cache: 'force-cache' })
      if (!resp.ok) return null
      const blob = await resp.blob()
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const format = detectFormat(bytes) ?? 'JPEG'
      const dataUrl = await blobToDataUrl(blob)
      const { width, height } = await imageDimensions(dataUrl)
      return { dataUrl, bytes, format, width, height }
    } catch {
      return null
    }
  })()
  return _logoPromise
}

// ============================================================
// Internal helpers
// ============================================================

function fmtDate(d: Date | string | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return String(d)
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
function fmtDay(d: Date | string | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function deptName(id?: string | null): string {
  if (!id) return '—'
  return DEPARTMENTS_DATA.find(d => d.id === id)?.name ?? id
}
function inDateWindow(iso: string | undefined, from?: string, to?: string): boolean {
  if (!iso) return true
  const t = new Date(iso).getTime()
  if (from && t < new Date(from).getTime()) return false
  if (to && t > new Date(to).getTime() + 86_400_000) return false
  return true
}

// ============================================================
// Data builders — one per template
// ============================================================

function buildReportData(ctx: ReportContext): ReportData {
  const { templateId, templateName, filters, generatedAt } = ctx
  const deptFilter = filters.departmentId && filters.departmentId !== 'all' ? filters.departmentId : null

  // Common pool — most templates start from filtered research.
  const filteredResearch = RESEARCH_DATA.filter(r => {
    if (deptFilter && r.department_id !== deptFilter) return false
    if (!inDateWindow(r.created_at, filters.dateFrom, filters.dateTo)) return false
    return true
  })

  const filterChips: { label: string; value: string }[] = [
    { label: 'Date from', value: filters.dateFrom ? fmtDay(filters.dateFrom) : 'All' },
    { label: 'Date to',   value: filters.dateTo   ? fmtDay(filters.dateTo)   : 'All' },
    { label: 'Department', value: deptFilter ? deptName(deptFilter) : 'All departments' },
  ]

  const baseFooter =
    'Confidential — Prince Mohammed Bin Nasser Hospital · Health & Nursing Research Unit · Jazan, Saudi Arabia'

  const base = (overrides: Partial<ReportData>): ReportData => ({
    title: templateName,
    templateId,
    subtitle: 'Research Unit operations report',
    hospital: HOSPITAL,
    generatedAt: fmtDate(generatedAt),
    generatedBy: ctx.generatedBy || 'Research Unit',
    filters: filterChips,
    kpis: [],
    table: { headers: [], rows: [] },
    notes: [],
    footer: baseFooter,
    ...overrides,
  })

  switch (templateId) {
    case 'general':
      return base({
        subtitle: 'Complete portfolio of research projects',
        kpis: [
          { label: 'Total projects',   value: String(filteredResearch.length) },
          { label: 'Active',           value: String(filteredResearch.filter(r => r.status === 'active').length) },
          { label: 'Completed',        value: String(filteredResearch.filter(r => r.status === 'completed').length) },
          { label: 'Published',        value: String(filteredResearch.filter(r => r.publication_status === 'published').length) },
        ],
        table: {
          headers: ['Research ID', 'Title', 'Department', 'PI', 'Status', 'Progress'],
          rows: filteredResearch.map(r => [
            r.research_id,
            r.title,
            deptName(r.department_id),
            r.principal_investigator_name ?? '—',
            r.status.replace(/_/g, ' '),
            `${r.completion_percentage}%`,
          ]),
        },
      })

    case 'department': {
      const rows = DEPARTMENTS_DATA
        .filter(d => !deptFilter || d.id === deptFilter)
        .map(d => {
          const list = filteredResearch.filter(r => r.department_id === d.id)
          return [
            d.name,
            d.code,
            String(list.length),
            String(list.filter(r => r.status === 'active').length),
            String(list.filter(r => r.publication_status === 'published').length),
            String(list.filter(r => r.status === 'delayed').length),
          ]
        })
      return base({
        subtitle: 'Research performance by department',
        kpis: [
          { label: 'Departments', value: String(rows.length) },
          { label: 'Projects',    value: String(filteredResearch.length) },
          { label: 'Published',   value: String(filteredResearch.filter(r => r.publication_status === 'published').length) },
          { label: 'Delayed',     value: String(filteredResearch.filter(r => r.status === 'delayed').length) },
        ],
        table: {
          headers: ['Department', 'Code', 'Projects', 'Active', 'Published', 'Delayed'],
          rows,
        },
      })
    }

    case 'annual':
      return base({
        subtitle: `Annual analytics · ${generatedAt.getFullYear()}`,
        kpis: [
          { label: 'Total projects',  value: String(STATS_DATA.total_projects) },
          { label: 'Published papers', value: String(STATS_DATA.published_papers) },
          { label: 'Q1 publications',  value: String(STATS_DATA.q1_publications) },
          { label: 'Total budget',     value: `SAR ${(STATS_DATA.total_budget / 1_000_000).toFixed(2)}M` },
        ],
        table: {
          headers: ['Month', 'New projects', 'Completed', 'Published'],
          rows: MONTHLY_RESEARCH_DATA.map(m => [m.month, String(m.new), String(m.completed), String(m.published)]),
        },
        notes: [
          `Departments contributing: ${STATS_DATA.total_departments}`,
          `Investigators & staff: ${STATS_DATA.total_users}`,
          `Open-access publications: ${STATS_DATA.open_access_count}`,
        ],
      })

    case 'monthly':
      return base({
        subtitle: 'Monthly research activity summary',
        kpis: [
          { label: 'New this month',    value: String(STATS_DATA.this_month_new) },
          { label: 'Active research',   value: String(STATS_DATA.active_projects) },
          { label: 'Due this week',     value: String(STATS_DATA.upcoming_deadlines) },
          { label: 'Pending IRB',       value: String(STATS_DATA.pending_irb) },
        ],
        table: {
          headers: ['Research ID', 'Title', 'Stage', 'Status', 'Progress', 'Updated'],
          rows: filteredResearch.slice(0, 30).map(r => [
            r.research_id,
            r.title,
            WORKFLOW_STAGES[r.workflow_stage].label,
            r.status.replace(/_/g, ' '),
            `${r.completion_percentage}%`,
            fmtDay(r.updated_at),
          ]),
        },
      })

    case 'publication': {
      const pubs = filteredResearch.filter(r => r.publication_status === 'published')
      return base({
        subtitle: 'Published papers & journal analytics',
        kpis: [
          { label: 'Total published', value: String(pubs.length) },
          { label: 'Q1',              value: String(pubs.filter(p => p.journal_quartile === 'Q1').length) },
          { label: 'Q2',              value: String(pubs.filter(p => p.journal_quartile === 'Q2').length) },
          { label: 'Open access',     value: String(pubs.filter(p => p.is_open_access).length) },
        ],
        table: {
          headers: ['Research ID', 'Title', 'Journal', 'Quartile', 'Publication date', 'DOI'],
          rows: pubs.map(p => [
            p.research_id, p.title, p.journal_name ?? '—',
            p.journal_quartile, fmtDay(p.publication_date), p.doi ?? '—',
          ]),
        },
      })
    }

    case 'delayed': {
      const delayed = filteredResearch.filter(r => r.status === 'delayed' || (r.expected_completion_date && new Date(r.expected_completion_date) < new Date() && r.status !== 'completed'))
      return base({
        subtitle: 'Projects behind schedule',
        kpis: [
          { label: 'Total delayed',  value: String(delayed.length) },
          { label: 'Active',         value: String(delayed.filter(r => r.status === 'active').length) },
          { label: 'High priority',  value: String(delayed.filter(r => r.priority_level === 'high' || r.priority_level === 'critical').length) },
          { label: 'Most affected',  value: deptName(
              [...delayed].sort((a, b) =>
                delayed.filter(x => x.department_id === b.department_id).length
                - delayed.filter(x => x.department_id === a.department_id).length,
              )[0]?.department_id,
            ),
          },
        ],
        table: {
          headers: ['Research ID', 'Title', 'Department', 'PI', 'Expected', 'Days delayed'],
          rows: delayed.map(r => {
            const days = r.expected_completion_date
              ? Math.max(0, Math.round((Date.now() - new Date(r.expected_completion_date).getTime()) / 86_400_000))
              : 0
            return [
              r.research_id, r.title, deptName(r.department_id),
              r.principal_investigator_name ?? '—',
              fmtDay(r.expected_completion_date),
              String(days),
            ]
          }),
        },
      })
    }

    case 'irb':
      return base({
        subtitle: 'IRB / ethics approval status',
        kpis: [
          { label: 'Pending',     value: String(filteredResearch.filter(r => r.irb_approval_status === 'pending').length) },
          { label: 'Approved',    value: String(filteredResearch.filter(r => r.irb_approval_status === 'approved').length) },
          { label: 'Rejected',    value: String(filteredResearch.filter(r => r.irb_approval_status === 'rejected').length) },
          { label: 'Not required', value: String(filteredResearch.filter(r => r.irb_approval_status === 'not_required').length) },
        ],
        table: {
          headers: ['Research ID', 'Title', 'Department', 'IRB status', 'IRB date', 'IRB #'],
          rows: filteredResearch.map(r => [
            r.research_id, r.title, deptName(r.department_id),
            r.irb_approval_status, fmtDay(r.irb_approval_date), r.irb_approval_number ?? '—',
          ]),
        },
      })

    case 'budget': {
      const funded = filteredResearch.filter(r => typeof r.budget === 'number' && r.budget > 0)
      const total = funded.reduce((s, r) => s + (r.budget ?? 0), 0)
      const avg   = funded.length ? Math.round(total / funded.length) : 0
      const max   = Math.max(0, ...funded.map(r => r.budget ?? 0))
      return base({
        subtitle: 'Research funding & budget overview',
        kpis: [
          { label: 'Funded projects', value: String(funded.length) },
          { label: 'Total budget',    value: `SAR ${(total / 1000).toLocaleString()}K` },
          { label: 'Average',         value: `SAR ${avg.toLocaleString()}` },
          { label: 'Largest',         value: `SAR ${max.toLocaleString()}` },
        ],
        table: {
          headers: ['Research ID', 'Title', 'Department', 'Funding source', 'Budget (SAR)'],
          rows: funded.map(r => [
            r.research_id, r.title, deptName(r.department_id),
            r.funding_source ?? '—',
            (r.budget ?? 0).toLocaleString(),
          ]),
        },
      })
    }

    case 'staff':
      return base({
        subtitle: 'Researcher productivity & engagement',
        kpis: [
          { label: 'Researchers',  value: String(USERS_DATA.length) },
          { label: 'Active',       value: String(USERS_DATA.filter(u => u.is_active).length) },
          { label: 'Departments',  value: String(new Set(USERS_DATA.map(u => u.department_id)).size) },
          { label: 'Total logins', value: String(USERS_DATA.reduce((s, u) => s + (u.login_count ?? 0), 0)) },
        ],
        table: {
          headers: ['Full name', 'Email', 'Role', 'Department', 'Logins', 'Last login'],
          rows: USERS_DATA.map(u => [
            u.full_name, u.email, ROLE_LABELS[u.role], deptName(u.department_id),
            String(u.login_count ?? 0), fmtDay(u.last_login),
          ]),
        },
      })

    case 'journal': {
      const pubs = filteredResearch.filter(r => r.publication_status === 'published')
      const byQ = (q: string) => pubs.filter(p => p.journal_quartile === q).length
      return base({
        subtitle: 'Q1–Q4 distribution & impact factors',
        kpis: [
          { label: 'Q1', value: String(byQ('Q1')) },
          { label: 'Q2', value: String(byQ('Q2')) },
          { label: 'Q3', value: String(byQ('Q3')) },
          { label: 'Q4', value: String(byQ('Q4')) },
        ],
        table: {
          headers: ['Research ID', 'Title', 'Journal', 'Quartile', 'Impact factor', 'Indexed'],
          rows: pubs.map(p => [
            p.research_id, p.title, p.journal_name ?? '—',
            p.journal_quartile, p.impact_factor?.toFixed(2) ?? '—', p.indexed_database,
          ]),
        },
      })
    }

    case 'visitor': {
      const pub = filteredResearch.filter(r => r.is_public || r.publication_status === 'published')
      return base({
        subtitle: 'Approved public-portal research',
        kpis: [
          { label: 'Public records', value: String(pub.length) },
          { label: 'Departments',    value: String(new Set(pub.map(r => r.department_id)).size) },
          { label: 'Q1 publications', value: String(pub.filter(r => r.journal_quartile === 'Q1').length) },
          { label: 'Open access',    value: String(pub.filter(r => r.is_open_access).length) },
        ],
        table: {
          headers: ['Research ID', 'Title', 'Department', 'Journal', 'Publication date'],
          rows: pub.map(r => [
            r.research_id, r.title, deptName(r.department_id),
            r.journal_name ?? '—', fmtDay(r.publication_date),
          ]),
        },
      })
    }
  }
}

// ============================================================
// PDF
// ============================================================

async function pdfFromData(data: ReportData): Promise<Blob> {
  // Pre-load the logo once. If the public file is missing we'll fall back to
  // a text-only header bar — the rest of the document still renders cleanly.
  const logo = await loadLogo()
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const usable = pageWidth - margin * 2
  let y = margin

  // ---------- Hospital header (rendered on every page) ----------
  const drawHeader = () => {
    // Brand bar
    doc.setFillColor(...COLORS.navy)
    doc.rect(0, 0, pageWidth, 24, 'F')

    let textX = margin
    if (logo && logo.width > 0 && logo.height > 0) {
      // Constrain to an 18×18mm square in the header bar, preserving aspect.
      const maxSide = 18
      const scale = Math.min(maxSide / logo.width, maxSide / logo.height)
      const w = logo.width * scale
      const h = logo.height * scale
      const imgY = (24 - h) / 2
      doc.addImage(logo.dataUrl, logo.format, margin, imgY, w, h)
      textX = margin + maxSide + 4
    }

    doc.setTextColor(...COLORS.white)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(HOSPITAL.name, textX, 11)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`${HOSPITAL.unit} · ${HOSPITAL.location}`, textX, 17)

    // Right-side timestamp
    doc.setFontSize(8)
    doc.text(data.generatedAt, pageWidth - margin, 17, { align: 'right' })

    // Reset text colour for body
    doc.setTextColor(...COLORS.text)
    y = 32
  }

  function drawFooter(pageNum: number, totalPages: number) {
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.text(data.footer, margin, pageHeight - 8)
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
    doc.setTextColor(...COLORS.text)
  }

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - 18) {
      doc.addPage()
      drawHeader()
    }
  }

  drawHeader()

  // ---------- Title block ----------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...COLORS.navy)
  doc.text(data.title, margin, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.muted)
  doc.text(data.subtitle, margin, y)
  y += 7
  doc.setTextColor(...COLORS.text)

  // ---------- Filter chips ----------
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  let chipX = margin
  data.filters.forEach(f => {
    const text = `${f.label}: ${f.value}`
    const w = doc.getTextWidth(text) + 6
    if (chipX + w > pageWidth - margin) {
      chipX = margin
      y += 7
    }
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(chipX, y - 4, w, 6, 1.5, 1.5, 'F')
    doc.setTextColor(...COLORS.navy)
    doc.text(text, chipX + 3, y)
    chipX += w + 2
  })
  doc.setTextColor(...COLORS.text)
  y += 10

  // ---------- KPI strip ----------
  if (data.kpis.length) {
    const colW = usable / data.kpis.length
    ensureSpace(20)
    data.kpis.forEach((k, i) => {
      const x = margin + i * colW
      doc.setFillColor(...COLORS.rowEven)
      doc.roundedRect(x, y, colW - 2, 18, 2, 2, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...COLORS.muted)
      doc.text(k.label.toUpperCase(), x + 3, y + 5)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(...COLORS.navy)
      doc.text(k.value, x + 3, y + 13)
    })
    doc.setTextColor(...COLORS.text)
    y += 22
  }

  // ---------- Table ----------
  if (data.table.headers.length) {
    const headers = data.table.headers
    const rows = data.table.rows

    // Compute column widths: first column wider for IDs, last column narrower
    const baseW = usable / headers.length
    const colWidths = headers.map((h, i) => {
      // Heuristic: title column gets 2× width
      if (/title/i.test(h)) return baseW * 1.8
      if (/email|journal|funding|description|notes/i.test(h)) return baseW * 1.3
      return baseW
    })
    // Normalise widths to sum to `usable`
    const widthSum = colWidths.reduce((s, w) => s + w, 0)
    const scale = usable / widthSum
    const widths = colWidths.map(w => w * scale)

    const drawTableHeader = () => {
      ensureSpace(8)
      doc.setFillColor(...COLORS.brand)
      doc.rect(margin, y, usable, 8, 'F')
      doc.setTextColor(...COLORS.white)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      let x = margin
      headers.forEach((h, i) => {
        doc.text(h, x + 2, y + 5.5)
        x += widths[i]
      })
      doc.setTextColor(...COLORS.text)
      y += 8
    }

    drawTableHeader()

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    rows.forEach((row, rowIdx) => {
      // Pre-split each cell into wrapped lines
      const wrapped = row.map((cell, i) => {
        const txt = String(cell ?? '')
        return doc.splitTextToSize(txt, widths[i] - 4)
      })
      const lineHeight = 4.2
      const cellPadding = 1.5
      const rowH = Math.max(...wrapped.map(lines => lines.length * lineHeight)) + cellPadding * 2

      if (y + rowH > pageHeight - 18) {
        // Page break — redraw header on the new page.
        doc.addPage()
        drawHeader()
        drawTableHeader()
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
      }

      // Zebra
      if (rowIdx % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(margin, y, usable, rowH, 'F')
      }

      let x = margin
      wrapped.forEach((lines, i) => {
        doc.text(lines, x + 2, y + cellPadding + 3)
        x += widths[i]
      })

      // Bottom rule
      doc.setDrawColor(...COLORS.rule)
      doc.setLineWidth(0.1)
      doc.line(margin, y + rowH, margin + usable, y + rowH)

      y += rowH
    })
  }

  // Notes
  if (data.notes.length) {
    ensureSpace(14)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.navy)
    doc.text('Notes', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.text)
    data.notes.forEach(n => {
      const lines = doc.splitTextToSize(`• ${n}`, usable)
      ensureSpace(lines.length * 4 + 1)
      doc.text(lines, margin, y)
      y += lines.length * 4 + 1
    })
  }

  // Footer pass — number every page
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    drawFooter(i, total)
  }

  return doc.output('blob')
}

// ============================================================
// DOCX
// ============================================================

async function docxFromData(data: ReportData): Promise<Blob> {
  const logo = await loadLogo()
  const docx = await import('docx')
  const {
    AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun,
    PageNumber, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun,
    VerticalAlign, WidthType,
  } = docx

  const HEAD_FILL = '0F2460'
  const ROW_FILL  = 'F1F5F9'

  function headerCell(text: string) {
    return new TableCell({
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: HEAD_FILL },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })] })],
    })
  }
  function bodyCell(text: string, even: boolean) {
    return new TableCell({
      shading: even ? { type: ShadingType.CLEAR, color: 'auto', fill: ROW_FILL } : undefined,
      children: [new Paragraph({ children: [new TextRun({ text, size: 18 })] })],
    })
  }

  // KPI table (compact 1-row table of label+value cells)
  const kpiRow = new TableRow({
    children: data.kpis.flatMap(k => [
      new TableCell({
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'E2E8F0' },
        children: [
          new Paragraph({ children: [new TextRun({ text: k.label.toUpperCase(), bold: true, color: '0F2460', size: 14 })] }),
          new Paragraph({ children: [new TextRun({ text: k.value, bold: true, size: 24 })] }),
        ],
      }),
    ]),
  })
  const kpiTable = data.kpis.length
    ? new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [kpiRow] })
    : null

  // Main data table
  const mainTable = data.table.headers.length
    ? new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: data.table.headers.map(headerCell) }),
          ...data.table.rows.map((r, i) => new TableRow({
            children: r.map(c => bodyCell(String(c ?? ''), i % 2 === 0)),
          })),
        ],
      })
    : null

  const filterParagraph = new Paragraph({
    children: data.filters.flatMap((f, i) => [
      new TextRun({ text: `${f.label}: `, bold: true, color: '0F2460', size: 18 }),
      new TextRun({ text: f.value + (i < data.filters.length - 1 ? '   ·   ' : ''), size: 18 }),
    ]),
  })

  const titleParagraph = new Paragraph({
    heading: HeadingLevel.TITLE,
    children: [new TextRun({ text: data.title, bold: true, color: '0F2460' })],
  })
  const subtitleParagraph = new Paragraph({
    children: [new TextRun({ text: data.subtitle, italics: true, color: '475569', size: 22 })],
    spacing: { after: 200 },
  })

  const generatedParagraph = new Paragraph({
    children: [
      new TextRun({ text: 'Generated: ', bold: true, size: 18 }),
      new TextRun({ text: data.generatedAt + '   ·   ', size: 18 }),
      new TextRun({ text: 'By: ', bold: true, size: 18 }),
      new TextRun({ text: data.generatedBy, size: 18 }),
    ],
    spacing: { after: 200 },
  })

  const notesBlock = data.notes.length
    ? [
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Notes', bold: true, color: '0F2460' })],
          spacing: { before: 300, after: 100 },
        }),
        ...data.notes.map(n => new Paragraph({
          children: [new TextRun({ text: `• ${n}`, size: 20 })],
        })),
      ]
    : []

  const doc = new Document({
    creator: HOSPITAL.unit,
    title: data.title,
    description: data.subtitle,
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              // Two-column borderless table: logo on the left, hospital text
              // on the right. Falls back to a text-only paragraph when the
              // logo file is missing.
              logo
                ? new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                      top:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      bottom: { style: BorderStyle.SINGLE, size: 6, color: '0F2460' },
                      left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                      insideVertical:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                    },
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            width: { size: 18, type: WidthType.PERCENTAGE },
                            verticalAlign: VerticalAlign.CENTER,
                            children: [
                              new Paragraph({
                                children: [
                                  new ImageRun({
                                    data: logo.bytes,
                                    transformation: (() => {
                                      const aspect = logo.height && logo.width
                                        ? logo.height / logo.width
                                        : 1
                                      const maxSide = 64
                                      const w = aspect <= 1 ? maxSide : Math.round(maxSide / aspect)
                                      const h = aspect <= 1 ? Math.round(maxSide * aspect) : maxSide
                                      return { width: w, height: h }
                                    })(),
                                    type: logo.format === 'PNG' ? 'png' : 'jpg',
                                  } as unknown as ConstructorParameters<typeof ImageRun>[0]),
                                ],
                              }),
                            ],
                          }),
                          new TableCell({
                            width: { size: 82, type: WidthType.PERCENTAGE },
                            verticalAlign: VerticalAlign.CENTER,
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({ text: HOSPITAL.name, bold: true, color: '0F2460', size: 22 }),
                                ],
                              }),
                              new Paragraph({
                                children: [
                                  new TextRun({ text: `${HOSPITAL.unit} · ${HOSPITAL.location}`, color: '475569', size: 16 }),
                                  new TextRun({ text: `   |   ${HOSPITAL.nameAr}`, color: '475569', size: 16 }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  })
                : new Paragraph({
                    children: [
                      new TextRun({ text: HOSPITAL.name, bold: true, color: '0F2460', size: 22 }),
                    ],
                  }),
              logo
                ? new Paragraph({ children: [new TextRun({ text: '' })] })
                : new Paragraph({
                    children: [
                      new TextRun({ text: `${HOSPITAL.unit} · ${HOSPITAL.location}`, color: '475569', size: 16 }),
                      new TextRun({ text: `   |   ${HOSPITAL.nameAr}`, color: '475569', size: 16 }),
                    ],
                    border: { bottom: { color: '0F2460', size: 6, space: 4, style: BorderStyle.SINGLE } },
                  }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: data.footer + '   ·   Page ', color: '94A3B8', size: 14 }),
                  new TextRun({ children: [PageNumber.CURRENT], color: '94A3B8', size: 14 }),
                  new TextRun({ text: ' of ', color: '94A3B8', size: 14 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], color: '94A3B8', size: 14 }),
                ],
              }),
            ],
          }),
        },
        children: [
          titleParagraph,
          subtitleParagraph,
          generatedParagraph,
          filterParagraph,
          new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 200 } }),
          ...(kpiTable ? [kpiTable, new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 200 } })] : []),
          ...(mainTable ? [mainTable] : []),
          ...notesBlock,
        ],
      },
    ],
  })

  return await Packer.toBlob(doc)
}

// ============================================================
// XLSX
// ============================================================

async function xlsxFromData(data: ReportData): Promise<Blob> {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // Sheet 1: Summary
  const summary: (string | number)[][] = [
    [HOSPITAL.name],
    [`${HOSPITAL.unit} · ${HOSPITAL.location}`],
    [data.title],
    [data.subtitle],
    [`Generated: ${data.generatedAt}`],
    [`By: ${data.generatedBy}`],
    [],
    ...data.filters.map(f => [f.label, f.value]),
    [],
    ['Key metrics'],
    ...data.kpis.map(k => [k.label, k.value]),
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summary)
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // Sheet 2: Data
  if (data.table.headers.length) {
    const sheet = XLSX.utils.aoa_to_sheet([data.table.headers, ...data.table.rows])
    XLSX.utils.book_append_sheet(wb, sheet, 'Data')
  }

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// ============================================================
// CSV
// ============================================================

function csvFromData(data: ReportData): Blob {
  function escape(cell: unknown): string {
    const s = cell == null ? '' : String(cell)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines: string[] = [
    `# ${HOSPITAL.name}`,
    `# ${HOSPITAL.unit} · ${HOSPITAL.location}`,
    `# Report: ${data.title}`,
    `# Generated: ${data.generatedAt}`,
    `# By: ${data.generatedBy}`,
    ...data.filters.map(f => `# ${f.label}: ${f.value}`),
    '',
    'KEY METRICS',
    ...data.kpis.map(k => `${escape(k.label)},${escape(k.value)}`),
    '',
    'DATA',
    data.table.headers.map(escape).join(','),
    ...data.table.rows.map(row => row.map(escape).join(',')),
  ]
  // BOM ensures Excel picks up UTF-8 (including Arabic) correctly.
  return new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
}

// ============================================================
// PPTX
// ============================================================

async function pptxFromData(data: ReportData): Promise<Blob> {
  const logo = await loadLogo()
  const mod = await import('pptxgenjs')
  // pptxgenjs ships UMD; `default` is the constructor on the namespace.
  type PptxCtor = new () => { addSlide: () => unknown; write: (opts: string) => Promise<Blob>;
                              layout: string; defineSlideMaster: (...args: unknown[]) => void }
  const PptxCtor = (mod as unknown as { default: PptxCtor }).default ?? (mod as unknown as PptxCtor)
  const pres = new (PptxCtor as unknown as new () => any)()
  pres.layout = 'LAYOUT_WIDE' // 13.33 × 7.5 in

  // ---- Title slide ----
  const title = pres.addSlide()
  title.background = { color: '0F2460' }
  if (logo) {
    // Render centered above the title at 1.6 in tall, preserving aspect.
    const aspect = logo.height && logo.width ? logo.height / logo.width : 1
    const h = 1.6
    const w = h / aspect
    title.addImage({
      data: logo.dataUrl,
      x: (13.33 - w) / 2, y: 0.8, w, h,
    })
    title.addText(HOSPITAL.name,
      { x: 0.6, y: 2.6, w: 12, h: 0.6, color: 'FFFFFF', fontSize: 22, bold: true, align: 'center' })
    title.addText(`${HOSPITAL.unit} · ${HOSPITAL.location}`,
      { x: 0.6, y: 3.2, w: 12, h: 0.4, color: 'B6D2FF', fontSize: 14, align: 'center' })
    title.addText(data.title,
      { x: 0.6, y: 4.2, w: 12, h: 1.0, color: 'FFFFFF', fontSize: 36, bold: true, align: 'center' })
    title.addText(data.subtitle,
      { x: 0.6, y: 5.3, w: 12, h: 0.6, color: 'BFDBFE', fontSize: 16, align: 'center' })
  } else {
    title.addText(HOSPITAL.name, { x: 0.6, y: 0.6, w: 12, h: 0.6, color: 'FFFFFF', fontSize: 22, bold: true })
    title.addText(`${HOSPITAL.unit} · ${HOSPITAL.location}`, { x: 0.6, y: 1.2, w: 12, h: 0.4, color: 'B6D2FF', fontSize: 14 })
    title.addText(data.title, { x: 0.6, y: 3.0, w: 12, h: 1.0, color: 'FFFFFF', fontSize: 38, bold: true })
    title.addText(data.subtitle, { x: 0.6, y: 4.2, w: 12, h: 0.6, color: 'BFDBFE', fontSize: 18 })
  }
  title.addText(`Generated: ${data.generatedAt} · By: ${data.generatedBy}`,
    { x: 0.6, y: 6.7, w: 12, h: 0.4, color: '94A3B8', fontSize: 12, align: 'center' })

  // ---- KPI slide ----
  if (data.kpis.length) {
    const kpi = pres.addSlide()
    kpi.addText('Key metrics', { x: 0.6, y: 0.4, w: 12, h: 0.6, color: '0F2460', fontSize: 24, bold: true })
    const colW = (12) / data.kpis.length
    data.kpis.forEach((k, i) => {
      const x = 0.6 + i * colW
      kpi.addShape('rect', { x, y: 1.6, w: colW - 0.2, h: 2.4, fill: { color: 'F1F5F9' }, line: { color: 'E2E8F0' } })
      kpi.addText(k.label.toUpperCase(),
        { x: x + 0.2, y: 1.8, w: colW - 0.4, h: 0.4, color: '475569', fontSize: 11, bold: true })
      kpi.addText(k.value,
        { x: x + 0.2, y: 2.3, w: colW - 0.4, h: 1.2, color: '0F2460', fontSize: 36, bold: true })
    })
  }

  // ---- Data table slide ----
  if (data.table.headers.length) {
    const tbl = pres.addSlide()
    tbl.addText(data.title, { x: 0.6, y: 0.4, w: 12, h: 0.6, color: '0F2460', fontSize: 22, bold: true })

    const head = data.table.headers.map(h => ({
      text: h,
      options: { bold: true, color: 'FFFFFF', fill: { color: '0F2460' } },
    }))
    const rows = data.table.rows.slice(0, 18).map(r => r.map(c => ({ text: String(c ?? '') })))
    tbl.addTable([head, ...rows], {
      x: 0.6, y: 1.2, w: 12.1,
      fontSize: 10, color: '1E293B',
      border: { type: 'solid', pt: 0.5, color: 'CBD5E1' },
    })
    if (data.table.rows.length > 18) {
      tbl.addText(`+ ${data.table.rows.length - 18} more rows (see PDF / Excel for full data)`,
        { x: 0.6, y: 6.9, w: 12, h: 0.4, color: '64748B', fontSize: 10, italic: true })
    }
  }

  // ---- Footer slide ----
  const end = pres.addSlide()
  end.addText(data.footer, { x: 0.6, y: 3.5, w: 12, h: 0.6, color: '64748B', fontSize: 14, align: 'center' })

  const out = await pres.write({ outputType: 'blob' }) as Blob
  return out
}

// ============================================================
// Public entry point
// ============================================================

export async function generateReport(
  ctx: ReportContext,
  format: ReportFormat,
): Promise<{ blob: Blob; filename: string; mime: string }> {
  const data = buildReportData(ctx)
  const stamp = ctx.generatedAt.toISOString().replace(/[:.]/g, '-').slice(0, 16)
  const base = `pmnh-${ctx.templateId}-${stamp}`

  switch (format) {
    case 'PDF': {
      const blob = await pdfFromData(data)
      return { blob, filename: `${base}.pdf`, mime: 'application/pdf' }
    }
    case 'Word': {
      const blob = await docxFromData(data)
      return { blob, filename: `${base}.docx`, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    }
    case 'Excel': {
      const blob = await xlsxFromData(data)
      return { blob, filename: `${base}.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    }
    case 'CSV': {
      const blob = csvFromData(data)
      return { blob, filename: `${base}.csv`, mime: 'text/csv;charset=utf-8' }
    }
    case 'PowerPoint': {
      const blob = await pptxFromData(data)
      return { blob, filename: `${base}.pptx`, mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }
    }
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke later — Chrome needs the URL alive for a moment after click.
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
