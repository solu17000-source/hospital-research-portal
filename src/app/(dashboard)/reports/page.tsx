'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  AlertTriangle, BookOpen, Building2, Calendar, CheckCircle, Clock,
  DollarSign, Download, Eye, FileBarChart, FlaskConical, Globe, Mail,
  Sparkles, Star, Trash2, Users,
} from 'lucide-react'

import { useAuthStore } from '@/lib/auth-store'
import {
  downloadBlob, generateReport, type ReportFormat, type ReportTemplateId,
} from '@/lib/report-generators'
import { cn, formatDate } from '@/lib/utils'

// ---------- Template catalogue ----------

type Template = {
  id: ReportTemplateId
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}
const REPORT_TEMPLATES: Template[] = [
  { id: 'general',     name: 'General Research Report',     description: 'Complete overview of all research projects',         icon: FlaskConical,   color: 'blue'    },
  { id: 'department',  name: 'Department Productivity',     description: 'Research performance by department',                icon: Building2,      color: 'purple'  },
  { id: 'annual',      name: 'Annual Research Analytics',   description: 'Year-end comprehensive analytics report',           icon: Calendar,       color: 'green'   },
  { id: 'monthly',     name: 'Monthly Progress Report',     description: 'Monthly research activity summary',                 icon: Clock,          color: 'cyan'    },
  { id: 'publication', name: 'Publication Report',         description: 'Published papers and journal analytics',            icon: BookOpen,       color: 'indigo'  },
  { id: 'delayed',     name: 'Delayed Projects Report',    description: 'Projects behind schedule analysis',                 icon: AlertTriangle,  color: 'orange'  },
  { id: 'irb',         name: 'IRB Approval Report',        description: 'IRB submission and approval status',                icon: CheckCircle,    color: 'teal'    },
  { id: 'budget',      name: 'Budget & Funding Report',    description: 'Research funding and budget overview',              icon: DollarSign,     color: 'yellow'  },
  { id: 'staff',       name: 'Staff Productivity Report',  description: 'Researcher performance and output',                 icon: Users,          color: 'pink'    },
  { id: 'journal',     name: 'Journal Ranking Report',     description: 'Q1–Q4 distribution and impact factors',             icon: Star,           color: 'amber'   },
  { id: 'visitor',     name: 'Public Research Report',     description: 'Approved public research summary',                  icon: Globe,          color: 'emerald' },
]

type SavedReport = {
  id: string; name: string; type: ReportTemplateId
  date: string; size: string; format: ReportFormat; downloads: number
}
const SAVED_REPORTS: SavedReport[] = [
  { id: '1', name: 'Annual Research Analytics 2025',  type: 'annual',      date: '2026-05-01', size: '2.4 MB', format: 'PDF',   downloads: 12 },
  { id: '2', name: 'Q1 2026 Monthly Progress',         type: 'monthly',     date: '2026-04-05', size: '1.1 MB', format: 'Excel', downloads: 8 },
  { id: '3', name: 'Nursing Department Productivity',  type: 'department',  date: '2026-03-15', size: '890 KB', format: 'PDF',   downloads: 5 },
  { id: '4', name: 'Publication Analytics 2025',       type: 'publication', date: '2026-02-20', size: '1.8 MB', format: 'PDF',   downloads: 19 },
]

const FORMAT_COLORS: Record<ReportFormat, string> = {
  PDF:        'bg-red-100 text-red-700',
  Excel:      'bg-green-100 text-green-700',
  CSV:        'bg-blue-100 text-blue-700',
  Word:       'bg-blue-100 text-blue-800',
  PowerPoint: 'bg-orange-100 text-orange-700',
}

function tintClass(color: string): string {
  const map: Record<string, string> = {
    blue:    'bg-blue-100 text-blue-600',
    purple:  'bg-purple-100 text-purple-600',
    green:   'bg-green-100 text-green-600',
    cyan:    'bg-cyan-100 text-cyan-600',
    indigo:  'bg-indigo-100 text-indigo-600',
    orange:  'bg-orange-100 text-orange-600',
    teal:    'bg-teal-100 text-teal-600',
    yellow:  'bg-yellow-100 text-yellow-600',
    pink:    'bg-pink-100 text-pink-600',
    amber:   'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
  }
  return map[color] ?? 'bg-gray-100 text-gray-600'
}

// ----------------- Page -----------------

export default function ReportsPage() {
  const { user } = useAuthStore()

  const [generating, setGenerating] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>('PDF')
  const [selectedDept, setSelectedDept] = useState<string>('all')

  // History of in-session generated downloads (front-loads UI so users see
  // results before any backend exists).
  const [history, setHistory] = useState<{
    key: string; name: string; templateId: ReportTemplateId; format: ReportFormat
    bytes: number; filename: string; at: string
  }[]>([])

  const generatedByName = user?.full_name ?? 'Research Unit'

  async function handleGenerate(template: Template, formatOverride?: ReportFormat) {
    const fmt = formatOverride ?? selectedFormat
    const key = `${template.id}-${fmt}-${Date.now()}`
    setGenerating(key)
    try {
      const result = await generateReport(
        {
          templateId: template.id,
          templateName: template.name,
          filters: { dateFrom, dateTo, departmentId: selectedDept },
          generatedAt: new Date(),
          generatedBy: generatedByName,
        },
        fmt,
      )
      downloadBlob(result.blob, result.filename)
      setHistory(h => [{
        key, name: template.name, templateId: template.id, format: fmt,
        bytes: result.blob.size, filename: result.filename, at: new Date().toISOString(),
      }, ...h].slice(0, 20))
      toast.success(`${template.name} (${fmt}) — ${formatBytes(result.blob.size)} saved`)
    } catch (e) {
      console.error('Report generation failed', e)
      toast.error(`Failed to generate ${template.name}: ${(e as Error).message || 'unknown error'}`)
    } finally {
      setGenerating(null)
    }
  }

  async function handleSavedDownload(saved: SavedReport) {
    // We don't have actual stored files — regenerate the same template/format
    // at click time. This is exactly how a real server would resolve a stored
    // report row to a fresh file.
    const tmpl = REPORT_TEMPLATES.find(t => t.id === saved.type)
    if (!tmpl) { toast.error('Unknown report type'); return }
    await handleGenerate(tmpl, saved.format)
  }

  return (
    <div className="space-y-6">

      {/* ===== Header ===== */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-blue-600" />
            Reports & Analytics
          </h1>
          <p className="page-subtitle">Generate, export and download real PDF, Word, Excel and PowerPoint reports.</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 bg-white border border-blue-100 rounded-2xl px-4 py-2 shadow-sm">
          <img
            src="/jazan-health-cluster.jpg"
            alt="Jazan Health Cluster"
            className="w-10 h-10 object-contain"
            onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = '/hospital-logo.svg' }}
          />
          <div className="text-right leading-tight">
            <p className="text-xs font-bold text-blue-900">Prince Mohammed Bin Nasser Hospital</p>
            <p className="text-xs text-blue-500">Health & Nursing Research Unit</p>
          </div>
        </div>
      </div>

      {/* ===== Document header preview (mirrors what's written into every file) ===== */}
      <div className="premium-card p-4 border-l-4 border-blue-600">
        <div className="flex items-center gap-4">
          <img
            src="/jazan-health-cluster.jpg"
            alt="Jazan Health Cluster"
            className="w-14 h-14 object-contain flex-shrink-0"
            onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = '/hospital-logo.svg' }}
          />
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
              Document header — Embedded in every generated file
            </p>
            <p className="font-bold text-gray-900">Health and Nursing Research Unit</p>
            <p className="text-sm text-gray-600">Prince Mohammed Bin Nasser Hospital · Jazan, Kingdom of Saudi Arabia</p>
          </div>
          <div className="text-right text-xs text-gray-400 hidden md:block">
            <p>مستشفى الأمير محمد بن ناصر</p>
            <p>وحدة البحث الصحي والتمريضي</p>
            <p>تجمع جازان الصحي</p>
          </div>
        </div>
      </div>

      {/* ===== Report options ===== */}
      <div className="premium-card p-5">
        <h2 className="font-bold text-gray-900 mb-4">Report options</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Date from</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">Date to</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">Export format</label>
            <select value={selectedFormat} onChange={e => setSelectedFormat(e.target.value as ReportFormat)} className="form-input">
              <option value="PDF">PDF (.pdf)</option>
              <option value="Word">Word (.docx)</option>
              <option value="Excel">Excel (.xlsx)</option>
              <option value="CSV">CSV (.csv)</option>
              <option value="PowerPoint">PowerPoint (.pptx)</option>
            </select>
          </div>
          <div>
            <label className="form-label">Department</label>
            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="form-input">
              <option value="all">All departments</option>
              <option value="d1">Internal Medicine</option>
              <option value="d2">Surgery</option>
              <option value="d3">Pediatrics</option>
              <option value="d4">Emergency</option>
              <option value="d5">ICU</option>
              <option value="d6">Nursing</option>
              <option value="d7">Cardiology</option>
              <option value="d9">Radiology</option>
              <option value="d10">Laboratory</option>
              <option value="d14">Administration</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===== Report templates ===== */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Generate report</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORT_TEMPLATES.map((template, i) => {
            const isGenerating = !!generating && generating.startsWith(template.id + '-')
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="premium-card p-4 hover:shadow-card-hover transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', tintClass(template.color))}>
                    <template.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm">{template.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => handleGenerate(template)}
                    disabled={isGenerating}
                    className="btn-primary flex-1 text-xs disabled:opacity-70"
                  >
                    {isGenerating ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Generate {selectedFormat}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerate(template, 'PDF')}
                    title="Quick PDF"
                    disabled={isGenerating}
                    className="btn-secondary text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.success('Email delivery would queue here (requires SMTP).')}
                    className="btn-secondary text-xs"
                    title="Email when ready"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ===== In-session downloads ===== */}
      {history.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Just downloaded</h2>
          <div className="premium-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Report</th>
                  <th>Format</th>
                  <th>Size</th>
                  <th>Generated</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.key}>
                    <td><span className="font-mono text-xs text-blue-700">{h.filename}</span></td>
                    <td><span className="text-sm font-medium">{h.name}</span></td>
                    <td><span className={cn('badge text-xs', FORMAT_COLORS[h.format])}>{h.format}</span></td>
                    <td><span className="text-xs text-gray-500 tabular-nums">{formatBytes(h.bytes)}</span></td>
                    <td><span className="text-xs text-gray-500">{formatDate(h.at, 'dd MMM yyyy HH:mm')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== Saved reports ===== */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Saved reports</h2>
        <div className="premium-card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Report name</th>
                <th>Type</th>
                <th>Generated</th>
                <th>Format</th>
                <th>Size</th>
                <th>Downloads</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {SAVED_REPORTS.map(report => (
                <tr key={report.id}>
                  <td><span className="font-medium text-sm text-gray-900">{report.name}</span></td>
                  <td><span className="text-xs text-gray-500 capitalize">{report.type}</span></td>
                  <td><span className="text-xs text-gray-500">{formatDate(report.date)}</span></td>
                  <td>
                    <span className={cn('badge text-xs', FORMAT_COLORS[report.format])}>{report.format}</span>
                  </td>
                  <td><span className="text-xs text-gray-500">{report.size}</span></td>
                  <td><span className="text-xs font-semibold text-gray-700 tabular-nums">{report.downloads}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleSavedDownload(report)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        title="Download (regenerates)"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.success('Report emailed (queue stub).')}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-500 p-4 bg-blue-50 rounded-xl border border-blue-100 leading-relaxed">
        <strong className="text-blue-900">Real downloads.</strong>{' '}
        Each "Generate" button now produces an actual file via{' '}
        <code className="bg-white px-1 rounded text-blue-700">jsPDF</code>,{' '}
        <code className="bg-white px-1 rounded text-blue-700">docx</code>,{' '}
        <code className="bg-white px-1 rounded text-blue-700">xlsx</code>{' '}
        or <code className="bg-white px-1 rounded text-blue-700">pptxgenjs</code>,
        embeds the hospital header, applies your filters, and saves to your downloads folder.
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}
