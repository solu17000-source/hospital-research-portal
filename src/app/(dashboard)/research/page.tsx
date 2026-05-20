'use client'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Search, Filter, Download, FlaskConical, Eye, QrCode,
  ChevronDown, ArrowUpDown, BookOpen, AlertTriangle, CheckCircle,
  Clock, X, SlidersHorizontal
} from 'lucide-react'
import Link from 'next/link'
import { DEMO_RESEARCH, DEMO_DEPARTMENTS } from '@/lib/demo-data'
import { cn, formatDate, getStatusBadgeClass, getPriorityClass, truncate } from '@/lib/utils'
import { WORKFLOW_STAGES, type ResearchStatus, type PriorityLevel, type WorkflowStage } from '@/types'

const STATUS_OPTIONS: { value: ResearchStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function ResearchPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ResearchStatus | 'all'>('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState<WorkflowStage | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState('updated_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [page, setPage] = useState(1)
  const perPage = 10

  const filtered = useMemo(() => {
    let data = [...DEMO_RESEARCH]
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.research_id.toLowerCase().includes(q) ||
        r.principal_investigator_name?.toLowerCase().includes(q) ||
        r.research_category?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') data = data.filter(r => r.status === statusFilter)
    if (deptFilter !== 'all') data = data.filter(r => r.department_id === deptFilter)
    if (stageFilter !== 'all') data = data.filter(r => r.workflow_stage === stageFilter)
    if (priorityFilter !== 'all') data = data.filter(r => r.priority_level === priorityFilter)
    data.sort((a, b) => {
      const av = (a as unknown as Record<string,unknown>)[sortField] as string
      const bv = (b as unknown as Record<string,unknown>)[sortField] as string
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
    return data
  }, [search, statusFilter, deptFilter, stageFilter, priorityFilter, sortField, sortDir])

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  const totalPages = Math.ceil(filtered.length / perPage)

  const getDeptName = (id?: string) => DEMO_DEPARTMENTS.find(d => d.id === id)?.name || 'N/A'

  const summaryStats = [
    { label: 'Total', value: DEMO_RESEARCH.length, color: 'blue', icon: FlaskConical },
    { label: 'Active', value: DEMO_RESEARCH.filter(r => r.status === 'active').length, color: 'green', icon: CheckCircle },
    { label: 'Delayed', value: DEMO_RESEARCH.filter(r => r.status === 'delayed').length, color: 'orange', icon: AlertTriangle },
    { label: 'Published', value: DEMO_RESEARCH.filter(r => r.publication_status === 'published').length, color: 'purple', icon: BookOpen },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Research Database</h1>
          <p className="page-subtitle">{DEMO_RESEARCH.length} total research projects across all departments</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
          <Link href="/research/new" className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            Add Research
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryStats.map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn('premium-card p-4 flex items-center gap-3',
              s.color === 'blue' && 'border-l-4 border-l-blue-500',
              s.color === 'green' && 'border-l-4 border-l-green-500',
              s.color === 'orange' && 'border-l-4 border-l-orange-500',
              s.color === 'purple' && 'border-l-4 border-l-purple-500',
            )}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
              s.color === 'blue' && 'bg-blue-100',
              s.color === 'green' && 'bg-green-100',
              s.color === 'orange' && 'bg-orange-100',
              s.color === 'purple' && 'bg-purple-100',
            )}>
              <s.icon className={cn('w-5 h-5',
                s.color === 'blue' && 'text-blue-600',
                s.color === 'green' && 'text-green-600',
                s.color === 'orange' && 'text-orange-600',
                s.color === 'purple' && 'text-purple-600',
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="premium-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by title, ID, investigator, category..."
              className="form-input pl-9" />
          </div>

          {/* Status filter */}
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as ResearchStatus | 'all'); setPage(1) }}
            className="form-input w-auto min-w-[140px]">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Department filter */}
          <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1) }}
            className="form-input w-auto min-w-[150px]">
            <option value="all">All Departments</option>
            {DEMO_DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          {/* More filters toggle */}
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn('btn-secondary text-sm gap-2', showFilters && 'bg-blue-50 border-blue-300 text-blue-700')}>
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {(stageFilter !== 'all' || priorityFilter !== 'all') && (
              <span className="w-4 h-4 bg-blue-600 rounded-full text-white text-xs flex items-center justify-center">!</span>
            )}
          </button>

          {/* Clear filters */}
          {(search || statusFilter !== 'all' || deptFilter !== 'all' || stageFilter !== 'all' || priorityFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setStatusFilter('all'); setDeptFilter('all'); setStageFilter('all'); setPriorityFilter('all') }}
              className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Extended filters */}
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
            <select value={stageFilter} onChange={e => { setStageFilter(e.target.value as WorkflowStage | 'all'); setPage(1) }}
              className="form-input w-auto min-w-[180px]">
              <option value="all">All Workflow Stages</option>
              {Object.entries(WORKFLOW_STAGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value as PriorityLevel | 'all'); setPage(1) }}
              className="form-input w-auto">
              <option value="all">All Priorities</option>
              {['low','medium','high','critical'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
          </motion.div>
        )}
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Showing {paginated.length} of {filtered.length} results</span>
        <div className="flex items-center gap-2">
          <span>Sort by:</span>
          <select value={sortField} onChange={e => setSortField(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none">
            <option value="updated_at">Last Updated</option>
            <option value="created_at">Date Created</option>
            <option value="title">Title</option>
            <option value="priority_level">Priority</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="text-gray-400 hover:text-gray-600">
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Research ID</th>
                <th className="min-w-[250px]">Title</th>
                <th>Principal Investigator</th>
                <th>Department</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Progress</th>
                <th>IRB</th>
                <th>Expected Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-gray-400">
                    <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No research projects found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                paginated.map(r => {
                  const stage = WORKFLOW_STAGES[r.workflow_stage]
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="font-mono text-xs font-bold text-blue-600">{r.research_id}</span>
                      </td>
                      <td>
                        <Link href={`/research/${r.id}`} className="hover:text-blue-600 transition-colors">
                          <p className="font-medium text-gray-900 text-xs">{truncate(r.title, 60)}</p>
                          {r.research_category && (
                            <span className="text-xs text-gray-400">{r.research_category}</span>
                          )}
                        </Link>
                      </td>
                      <td>
                        <span className="text-xs text-gray-700">{r.principal_investigator_name || 'N/A'}</span>
                      </td>
                      <td>
                        <span className="text-xs text-gray-600">{getDeptName(r.department_id)}</span>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap"
                          style={{ background: stage.color + '20', color: stage.color }}>
                          {stage.label}
                        </span>
                      </td>
                      <td>
                        <span className={cn('badge capitalize', getStatusBadgeClass(r.status))}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={cn('badge capitalize', getPriorityClass(r.priority_level))}>
                          {r.priority_level}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 min-w-[70px]">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${r.completion_percentage}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{r.completion_percentage}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={cn('badge capitalize', getStatusBadgeClass(r.irb_approval_status))}>
                          {r.irb_approval_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-gray-600 whitespace-nowrap">
                          {formatDate(r.expected_completion_date)}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link href={`/research/${r.id}`}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="View">
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <Link href={`/qr-codes?research=${r.id}`}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all" title="QR Code">
                            <QrCode className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition-colors">
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = page <= 3 ? i + 1 : page - 2 + i
                if (pageNum > totalPages) return null
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)}
                    className={cn('px-3 py-1.5 text-sm rounded-lg border transition-colors',
                      page === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50')}>
                    {pageNum}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
