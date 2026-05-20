'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileBarChart, Download, Printer, Mail, Plus, Calendar,
  Building2, Users, BookOpen, FlaskConical, Clock, DollarSign,
  CheckCircle, AlertTriangle, Star, Globe, Eye, Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, formatDate } from '@/lib/utils'

const REPORT_TEMPLATES = [
  { id: 'general', name: 'General Research Report', description: 'Complete overview of all research projects', icon: FlaskConical, color: 'blue' },
  { id: 'department', name: 'Department Productivity', description: 'Research performance by department', icon: Building2, color: 'purple' },
  { id: 'annual', name: 'Annual Research Analytics', description: 'Year-end comprehensive analytics report', icon: Calendar, color: 'green' },
  { id: 'monthly', name: 'Monthly Progress Report', description: 'Monthly research activity summary', icon: Clock, color: 'cyan' },
  { id: 'publication', name: 'Publication Report', description: 'Published papers and journal analytics', icon: BookOpen, color: 'indigo' },
  { id: 'delayed', name: 'Delayed Projects Report', description: 'Projects behind schedule analysis', icon: AlertTriangle, color: 'orange' },
  { id: 'irb', name: 'IRB Approval Report', description: 'IRB submission and approval status', icon: CheckCircle, color: 'teal' },
  { id: 'budget', name: 'Budget & Funding Report', description: 'Research funding and budget overview', icon: DollarSign, color: 'yellow' },
  { id: 'staff', name: 'Staff Productivity Report', description: 'Researcher performance and output', icon: Users, color: 'pink' },
  { id: 'journal', name: 'Journal Ranking Report', description: 'Q1–Q4 distribution and impact factors', icon: Star, color: 'amber' },
  { id: 'visitor', name: 'Public Research Report', description: 'Approved public research summary', icon: Globe, color: 'emerald' },
]

const SAVED_REPORTS = [
  { id: '1', name: 'Annual Research Analytics 2025', type: 'annual', date: '2026-05-01', size: '2.4 MB', format: 'PDF', downloads: 12 },
  { id: '2', name: 'Q1 2026 Monthly Progress', type: 'monthly', date: '2026-04-05', size: '1.1 MB', format: 'Excel', downloads: 8 },
  { id: '3', name: 'Nursing Department Productivity', type: 'department', date: '2026-03-15', size: '890 KB', format: 'PDF', downloads: 5 },
  { id: '4', name: 'Publication Analytics 2025', type: 'publication', date: '2026-02-20', size: '1.8 MB', format: 'PDF', downloads: 19 },
]

const FORMAT_COLORS: Record<string, string> = {
  PDF: 'bg-red-100 text-red-700',
  Excel: 'bg-green-100 text-green-700',
  CSV: 'bg-blue-100 text-blue-700',
  Word: 'bg-blue-100 text-blue-800',
  PowerPoint: 'bg-orange-100 text-orange-700',
}

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('PDF')
  const [selectedDept, setSelectedDept] = useState('all')

  const handleGenerate = async (reportId: string, name: string) => {
    setGenerating(reportId)
    await new Promise(r => setTimeout(r, 2000))
    setGenerating(null)
    toast.success(`${name} generated successfully! Downloading...`)
  }

  const colorClass = (color: string) => {
    const map: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      green: 'bg-green-100 text-green-600',
      cyan: 'bg-cyan-100 text-cyan-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      orange: 'bg-orange-100 text-orange-600',
      teal: 'bg-teal-100 text-teal-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      pink: 'bg-pink-100 text-pink-600',
      amber: 'bg-amber-100 text-amber-600',
      emerald: 'bg-emerald-100 text-emerald-600',
    }
    return map[color] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-blue-600" />
            Reports & Analytics
          </h1>
          <p className="page-subtitle">Generate, export and manage professional research reports</p>
        </div>
        {/* Hospital logo for document branding */}
        <div className="hidden sm:flex items-center gap-3 bg-white border border-blue-100 rounded-2xl px-4 py-2 shadow-sm">
          <img
            src="/hospital-logo.png"
            alt="PMNH"
            className="w-10 h-10 object-contain"
            onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = '/hospital-logo.svg' }}
          />
          <div className="text-right">
            <p className="text-xs font-bold text-blue-900 leading-tight">Prince Mohammed Bin Nasser Hospital</p>
            <p className="text-xs text-blue-500">Health & Nursing Research Unit</p>
          </div>
        </div>
      </div>

      {/* Document Header Preview (appears on all generated reports) */}
      <div className="premium-card p-4 border-l-4 border-blue-600">
        <div className="flex items-center gap-4">
          <img
            src="/hospital-logo.png"
            alt="PMNH Logo"
            className="w-14 h-14 object-contain flex-shrink-0"
            onError={(e) => { const t = e.currentTarget; t.onerror = null; t.src = '/hospital-logo.svg' }}
          />
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Document Header — Appears on all exported reports</p>
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

      {/* Report options */}
      <div className="premium-card p-5">
        <h2 className="font-bold text-gray-900 mb-4">Report Options</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Date From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">Date To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">Export Format</label>
            <select value={selectedFormat} onChange={e => setSelectedFormat(e.target.value)} className="form-input">
              <option value="PDF">PDF</option>
              <option value="Excel">Excel (.xlsx)</option>
              <option value="CSV">CSV</option>
              <option value="Word">Word (.docx)</option>
              <option value="PowerPoint">PowerPoint (.pptx)</option>
            </select>
          </div>
          <div>
            <label className="form-label">Department</label>
            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="form-input">
              <option value="all">All Departments</option>
              <option value="d1">Internal Medicine</option>
              <option value="d2">Surgery</option>
              <option value="d6">Nursing</option>
              <option value="d7">Cardiology</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report templates */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Generate Report</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORT_TEMPLATES.map((template, i) => (
            <motion.div key={template.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="premium-card p-4 hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-3">
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', colorClass(template.color))}>
                  <template.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">{template.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleGenerate(template.id, template.name)}
                  disabled={generating === template.id}
                  className="btn-primary flex-1 text-xs disabled:opacity-70">
                  {generating === template.id ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                  ) : (
                    <><Download className="w-3.5 h-3.5" /> Generate {selectedFormat}</>
                  )}
                </button>
                <button className="btn-secondary text-xs">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button className="btn-secondary text-xs" onClick={() => toast.success('Report scheduled for email delivery')}>
                  <Mail className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Saved reports */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Saved Reports</h2>
        <div className="premium-card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Report Name</th>
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
                  <td>
                    <span className="font-medium text-sm text-gray-900">{report.name}</span>
                  </td>
                  <td>
                    <span className="text-xs text-gray-500 capitalize">{report.type}</span>
                  </td>
                  <td>
                    <span className="text-xs text-gray-500">{formatDate(report.date)}</span>
                  </td>
                  <td>
                    <span className={cn('badge text-xs', FORMAT_COLORS[report.format] || 'bg-gray-100 text-gray-600')}>
                      {report.format}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-gray-500">{report.size}</span>
                  </td>
                  <td>
                    <span className="text-xs font-semibold text-gray-700">{report.downloads}</span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => toast.success(`Downloading ${report.name}...`)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toast.success('Report emailed successfully')}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all">
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
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

      <div className="text-xs text-gray-400 text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
        <strong>Note:</strong> Reports are generated with hospital branding, official header/footer, date stamp, and department information.
        PDF reports include embedded charts and analytics visualizations.
      </div>
    </div>
  )
}
