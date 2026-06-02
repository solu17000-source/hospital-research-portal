'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Edit2, QrCode, Download, Share2, Printer,
  Calendar, User, Building2, Shield, DollarSign, BookOpen,
  FileText, Clock, CheckCircle, AlertTriangle, Globe, Upload,
  ExternalLink, Activity, BarChart2, Paperclip, MessageSquare,
  Hash
} from 'lucide-react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import { useDepartments, useResearchById } from '@/lib/data-source'
import { WORKFLOW_STAGES, STATUS_COLORS, ROLE_LABELS } from '@/types'
import { cn, formatDate, formatCurrency, getStatusBadgeClass, getPriorityClass, timeAgo } from '@/lib/utils'

const TABS = ['Overview', 'Workflow', 'Publication', 'Attachments', 'Activity', 'QR Code']

export default function ResearchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('Overview')
  const [showQR, setShowQR] = useState(false)

  // Live data — fetch the specific project + the department catalogue for
  // the badge lookup. While the queries are in flight `research` is null and
  // we render a small loading screen instead of guessing.
  const researchId = Array.isArray(params.id) ? params.id[0] : (params.id as string | undefined) ?? ''
  const { data: research, loading } = useResearchById(researchId)
  const { data: deptData } = useDepartments()
  const departments = deptData ?? []

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading research…</p>
        </div>
      </div>
    )
  }
  if (!research) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="premium-card p-10 max-w-md text-center">
          <p className="font-semibold text-gray-700">Research project not found.</p>
          <button onClick={() => router.push('/research')} className="btn-primary text-sm mt-4">
            Back to Research Database
          </button>
        </div>
      </div>
    )
  }

  const dept = departments.find(d => d.id === research.department_id)
  const stage = WORKFLOW_STAGES[research.workflow_stage]
  const qrData = `${typeof window !== 'undefined' ? window.location.origin : ''}/research/${research.id}`

  const ApprovalBadge = ({ status, label }: { status: string; label: string }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={cn('badge capitalize', getStatusBadgeClass(status))}>
        {status.replace('_', ' ')}
      </span>
    </div>
  )

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all mt-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{research.research_id}</span>
              <span className={cn('badge capitalize', getStatusBadgeClass(research.status))}>{research.status.replace('_', ' ')}</span>
              <span className={cn('badge capitalize', getPriorityClass(research.priority_level))}>{research.priority_level} priority</span>
              {research.is_public && (
                <span className="badge bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Public
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{research.title}</h1>
            {research.title_ar && (
              <p className="text-gray-500 text-sm mt-1" dir="rtl">{research.title_ar}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setShowQR(true)}
            className="btn-secondary text-sm">
            <QrCode className="w-4 h-4" />
            QR
          </button>
          <Link href={`/research/${research.id}/edit`} className="btn-primary text-sm">
            <Edit2 className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="premium-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: stage.color + '20' }}>
              <Activity className="w-3.5 h-3.5" style={{ color: stage.color }} />
            </div>
            <span className="text-sm font-semibold text-gray-700">Current Stage: {stage.label}</span>
          </div>
          <span className="text-sm font-bold text-gray-900">{research.completion_percentage}% Complete</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${stage.color}, ${stage.color}dd)` }}
            initial={{ width: 0 }}
            animate={{ width: `${research.completion_percentage}%` }}
            transition={{ duration: 1 }} />
        </div>
        {/* Stage mini-timeline */}
        <div className="flex justify-between mt-3 overflow-x-auto scrollbar-hide">
          {Object.entries(WORKFLOW_STAGES).map(([key, s]) => {
            const isCompleted = s.order < stage.order
            const isCurrent = key === research.workflow_stage
            return (
              <div key={key} className="flex flex-col items-center gap-1 min-w-[60px]">
                <div className={cn('w-3 h-3 rounded-full border-2 transition-all',
                  isCompleted && 'bg-green-500 border-green-500',
                  isCurrent && 'border-blue-500 bg-blue-500',
                  !isCompleted && !isCurrent && 'bg-white border-gray-300',
                )} />
                <span className={cn('text-[9px] text-center font-medium leading-tight',
                  isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                )}>{s.label.split(' ').slice(0, 2).join(' ')}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="premium-card overflow-hidden">
        <div className="border-b border-gray-100 px-4 flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2',
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}>
              {tab}
            </button>
          ))}
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Overview Tab */}
              {activeTab === 'Overview' && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left column */}
                  <div className="space-y-5">
                    {research.abstract && (
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Abstract</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">{research.abstract}</p>
                      </div>
                    )}
                    {research.keywords && research.keywords.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Keywords</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {research.keywords.map((kw, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">{kw}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Investigators</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">PI</div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{research.principal_investigator_name || 'Not specified'}</p>
                            <p className="text-xs text-gray-500">Principal Investigator</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    {/* Info grid */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Project Details</h3>
                      <div className="space-y-2">
                        {[
                          { icon: Building2, label: 'Department', value: dept?.name || 'N/A' },
                          { icon: Hash, label: 'Category', value: research.research_category || 'N/A' },
                          { icon: Calendar, label: 'Start Date', value: formatDate(research.start_date) },
                          { icon: Calendar, label: 'Expected Completion', value: formatDate(research.expected_completion_date) },
                          { icon: Calendar, label: 'Actual Completion', value: formatDate(research.actual_completion_date) },
                          { icon: DollarSign, label: 'Funding Source', value: research.funding_source || 'N/A' },
                          { icon: DollarSign, label: 'Budget', value: formatCurrency(research.budget, research.budget_currency) },
                        ].map(item => (
                          <div key={item.label} className="flex items-start gap-3 text-sm">
                            <item.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-500 min-w-[120px]">{item.label}</span>
                            <span className="font-medium text-gray-900">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Approvals */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Approvals</h3>
                      <div className="space-y-2">
                        <ApprovalBadge status={research.irb_approval_status} label="IRB Approval" />
                        <ApprovalBadge status={research.department_approval_status} label="Department Approval" />
                        <ApprovalBadge status={research.ethics_approval_status} label="Ethics Approval" />
                      </div>
                    </div>

                    {research.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-sm text-yellow-800">{research.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Publication Tab */}
              {activeTab === 'Publication' && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Publication Status</p>
                      <span className={cn('badge text-sm capitalize', getStatusBadgeClass(research.publication_status))}>
                        {research.publication_status.replace('_', ' ')}
                      </span>
                    </div>
                    {research.journal_name && (
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Journal</p>
                        <p className="font-semibold text-gray-900">{research.journal_name}</p>
                      </div>
                    )}
                    {research.doi && (
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">DOI</p>
                        <a href={`https://doi.org/${research.doi}`} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                          {research.doi} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Journal Quartile</p>
                      <span className={cn('badge', getStatusBadgeClass(research.journal_quartile))}>
                        {research.journal_quartile}
                      </span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Indexed Database</p>
                      <span className="font-semibold text-gray-900 text-sm">{research.indexed_database}</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Impact Factor</p>
                      <p className="font-bold text-gray-900">{research.impact_factor || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Citations</p>
                      <p className="font-bold text-gray-900">{research.citation_count}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Publication Date</p>
                      <p className="font-semibold text-gray-900 text-sm">{formatDate(research.publication_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                    <div className={cn('w-3 h-3 rounded-full', research.is_open_access ? 'bg-green-500' : 'bg-gray-300')} />
                    <span className="text-sm text-gray-700">
                      {research.is_open_access ? 'Open Access publication' : 'Subscription-based journal'}
                    </span>
                  </div>
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === 'Attachments' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">Research documents and supporting files</p>
                    <button className="btn-primary text-sm">
                      <Upload className="w-4 h-4" />
                      Upload File
                    </button>
                  </div>
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
                    <Paperclip className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No attachments uploaded yet</p>
                    <p className="text-gray-400 text-sm mt-1">Upload proposals, IRB forms, manuscripts, and other documents</p>
                    <button className="btn-primary text-sm mt-4">
                      <Upload className="w-4 h-4" />
                      Upload First File
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 text-center">
                    Supported: PDF, Word, Excel, PowerPoint, Images · Max 50MB per file
                  </div>
                </div>
              )}

              {/* QR Code Tab */}
              {activeTab === 'QR Code' && (
                <div className="flex flex-col items-center gap-6 py-4">
                  <div className="text-center">
                    <h3 className="font-bold text-gray-900 text-lg">Research QR Code</h3>
                    <p className="text-sm text-gray-500 mt-1">Scan to access research registration form</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <QRCode value={qrData} size={200} />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-mono text-sm font-bold text-blue-600">{research.research_id}</p>
                    <p className="text-xs text-gray-500 max-w-xs">{qrData}</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="btn-secondary text-sm">
                      <Download className="w-4 h-4" />
                      Download QR
                    </button>
                    <button className="btn-secondary text-sm">
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                    <button className="btn-secondary text-sm">
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'Activity' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Recent changes and updates to this research project</p>
                  {[
                    { action: 'Workflow stage updated', detail: 'Stage changed to ' + stage.label, time: '2 days ago', user: 'Sultan Alallah' },
                    { action: 'Research project created', detail: 'New research project registered in the system', time: '3 months ago', user: 'Afnan Bakri' },
                  ].map((log, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Activity className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{log.action}</p>
                        <p className="text-xs text-gray-500">{log.detail}</p>
                        <p className="text-xs text-gray-400 mt-1">by {log.user} · {log.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Workflow Tab */}
              {activeTab === 'Workflow' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">Track progress through each research phase</p>
                    <Link href="/workflow" className="text-sm text-blue-600 hover:underline">Open Kanban Board →</Link>
                  </div>
                  {Object.entries(WORKFLOW_STAGES).map(([key, s]) => {
                    const isCompleted = s.order < stage.order
                    const isCurrent = key === research.workflow_stage
                    return (
                      <div key={key}
                        className={cn('flex items-center gap-4 p-4 rounded-xl border transition-all',
                          isCurrent && 'border-blue-200 bg-blue-50',
                          isCompleted && 'border-green-200 bg-green-50',
                          !isCompleted && !isCurrent && 'border-gray-200 bg-gray-50 opacity-50',
                        )}>
                        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                          isCompleted && 'bg-green-500',
                          isCurrent && 'bg-blue-500',
                          !isCompleted && !isCurrent && 'bg-gray-300',
                        )}>
                          {isCompleted
                            ? <CheckCircle className="w-4 h-4 text-white" />
                            : <span className="text-white text-xs font-bold">{s.order}</span>
                          }
                        </div>
                        <div className="flex-1">
                          <p className={cn('font-semibold text-sm',
                            isCurrent ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-500'
                          )}>
                            {s.label}
                            {isCurrent && <span className="ml-2 text-xs font-medium bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">Current Stage</span>}
                          </p>
                        </div>
                        <span className={cn('text-xs font-medium',
                          isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-400'
                        )}>
                          {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom metadata */}
      <div className="text-xs text-gray-400 flex items-center gap-4">
        <span>Created {timeAgo(research.created_at)}</span>
        <span>·</span>
        <span>Last updated {timeAgo(research.updated_at)}</span>
      </div>
    </div>
  )
}
