'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { GitBranch, Filter, BarChart2, List, KanbanSquare } from 'lucide-react'
import { DEMO_RESEARCH, DEMO_DEPARTMENTS } from '@/lib/demo-data'
import { WORKFLOW_STAGES, type WorkflowStage } from '@/types'
import { cn, truncate, getStatusBadgeClass } from '@/lib/utils'
import Link from 'next/link'

const STAGE_COLUMNS: WorkflowStage[] = [
  'idea_submitted', 'proposal_drafted', 'department_approval',
  'ethics_irb_approval', 'data_collection', 'data_analysis',
  'manuscript_writing', 'journal_submission', 'revision', 'accepted', 'published'
]

// Show only a subset of stages in the main kanban view for readability
const KANBAN_STAGES: WorkflowStage[] = [
  'idea_submitted', 'proposal_drafted', 'ethics_irb_approval',
  'data_collection', 'data_analysis', 'manuscript_writing',
  'journal_submission', 'published'
]

export default function WorkflowPage() {
  const [filterDept, setFilterDept] = useState('all')
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline'>('kanban')
  const [dragging, setDragging] = useState<string | null>(null)

  const getResearchByStage = (stage: WorkflowStage) =>
    DEMO_RESEARCH.filter(r =>
      r.workflow_stage === stage &&
      (filterDept === 'all' || r.department_id === filterDept)
    )

  const getDeptName = (id?: string) =>
    DEMO_DEPARTMENTS.find(d => d.id === id)?.name?.split(' ').slice(0, 2).join(' ') || 'N/A'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-blue-600" />
            Research Workflow Board
          </h1>
          <p className="page-subtitle">Track and manage research projects through all workflow stages</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setViewMode('kanban')}
              className={cn('px-3 py-2 flex items-center gap-1.5 text-sm font-medium transition-colors',
                viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
              <KanbanSquare className="w-4 h-4" />
              Kanban
            </button>
            <button onClick={() => setViewMode('timeline')}
              className={cn('px-3 py-2 flex items-center gap-1.5 text-sm font-medium transition-colors',
                viewMode === 'timeline' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
              <List className="w-4 h-4" />
              Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="form-input w-auto text-sm">
          <option value="all">All Departments</option>
          {DEMO_DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          {Object.entries(WORKFLOW_STAGES).slice(0, 4).map(([key, s]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
              <span className="text-xs text-gray-500">{s.label.split(' ').slice(0,2).join(' ')}</span>
            </div>
          ))}
          <span className="text-xs text-gray-400">+{Object.keys(WORKFLOW_STAGES).length - 4} more</span>
        </div>
      </div>

      {/* Stage summary bar */}
      <div className="premium-card p-4">
        <div className="flex overflow-x-auto scrollbar-hide gap-3">
          {STAGE_COLUMNS.map(stage => {
            const count = getResearchByStage(stage).length
            const s = WORKFLOW_STAGES[stage]
            return (
              <div key={stage} className="flex flex-col items-center gap-1 min-w-[70px] text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-white"
                  style={{ background: s.color }}>
                  {count}
                </div>
                <p className="text-xs text-gray-500 leading-tight">{s.label.split(' ').slice(0,2).join('\n')}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {KANBAN_STAGES.map(stage => {
              const s = WORKFLOW_STAGES[stage]
              const cards = getResearchByStage(stage)
              return (
                <div key={stage} className="w-72 flex-shrink-0">
                  {/* Column header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-2"
                    style={{ background: s.color + '15', border: `1px solid ${s.color}30` }}>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="font-semibold text-sm text-gray-800 flex-1">{s.label}</span>
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: s.color }}>
                      {cards.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2 min-h-[100px]">
                    {cards.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-200 rounded-xl h-24 flex items-center justify-center">
                        <p className="text-xs text-gray-400">No projects</p>
                      </div>
                    ) : (
                      cards.map(r => (
                        <motion.div
                          key={r.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all cursor-grab active:cursor-grabbing"
                          draggable
                          onDragStart={() => setDragging(r.id)}
                          onDragEnd={() => setDragging(null)}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono text-xs font-bold text-blue-600">{r.research_id}</span>
                            <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium capitalize',
                              r.priority_level === 'critical' && 'bg-red-100 text-red-700',
                              r.priority_level === 'high' && 'bg-orange-100 text-orange-700',
                              r.priority_level === 'medium' && 'bg-blue-100 text-blue-700',
                              r.priority_level === 'low' && 'bg-gray-100 text-gray-600',
                            )}>
                              {r.priority_level}
                            </span>
                          </div>
                          <p className="text-xs text-gray-800 font-medium leading-tight mb-2 line-clamp-2">{r.title}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">{getDeptName(r.department_id)}</span>
                            <div className="flex items-center gap-1">
                              <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full"
                                  style={{ width: `${r.completion_percentage}%`, background: s.color }} />
                              </div>
                              <span className="text-xs text-gray-400">{r.completion_percentage}%</span>
                            </div>
                          </div>
                          {r.status === 'delayed' && (
                            <div className="mt-2 flex items-center gap-1 text-orange-600 text-xs">
                              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                              Delayed
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Research ID</th>
                  <th>Title</th>
                  <th>Department</th>
                  <th>Current Stage</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>Expected End</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_RESEARCH
                  .filter(r => filterDept === 'all' || r.department_id === filterDept)
                  .map(r => {
                    const s = WORKFLOW_STAGES[r.workflow_stage]
                    return (
                      <tr key={r.id}>
                        <td>
                          <Link href={`/research/${r.id}`} className="font-mono text-xs font-bold text-blue-600 hover:underline">
                            {r.research_id}
                          </Link>
                        </td>
                        <td>
                          <p className="text-xs font-medium text-gray-900 max-w-[200px] line-clamp-2">{r.title}</p>
                        </td>
                        <td>
                          <span className="text-xs text-gray-500">{getDeptName(r.department_id)}</span>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
                            style={{ background: s.color + '20', color: s.color }}>
                            {s.label}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${r.completion_percentage}%`, background: s.color }} />
                            </div>
                            <span className="text-xs text-gray-500">{r.completion_percentage}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={cn('badge capitalize text-xs', getStatusBadgeClass(r.status))}>
                            {r.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td><span className="text-xs text-gray-500">{r.start_date?.slice(0, 7) || 'N/A'}</span></td>
                        <td><span className="text-xs text-gray-500">{r.expected_completion_date?.slice(0, 7) || 'N/A'}</span></td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Tip: Drag and drop cards between columns to update workflow stage (requires backend connection)
      </p>
    </div>
  )
}
