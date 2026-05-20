'use client'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, Search, Filter, BookOpen, Globe, ExternalLink,
  Building2, Calendar, ArrowLeft, BarChart2, Users, FlaskConical,
  ChevronRight, Eye
} from 'lucide-react'
import Link from 'next/link'
import { DEMO_RESEARCH, DEMO_DEPARTMENTS, DEMO_STATS } from '@/lib/demo-data'
import { cn, formatDate, getStatusBadgeClass } from '@/lib/utils'

const publicResearch = DEMO_RESEARCH.filter(r => r.is_public || r.publication_status === 'published')

export default function VisitorPortalPage() {
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [selected, setSelected] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return publicResearch.filter(r => {
      const q = search.toLowerCase()
      const matchSearch = !search || r.title.toLowerCase().includes(q) || r.journal_name?.toLowerCase().includes(q)
      const matchDept = deptFilter === 'all' || r.department_id === deptFilter
      const matchYear = yearFilter === 'all' || r.publication_date?.startsWith(yearFilter) || r.created_at.startsWith(yearFilter)
      return matchSearch && matchDept && matchYear
    })
  }, [search, deptFilter, yearFilter])

  const selectedResearch = filtered.find(r => r.id === selected)
  const getDeptName = (id?: string) => DEMO_DEPARTMENTS.find(d => d.id === id)?.name || 'N/A'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
      {/* Header */}
      <header className="gradient-header shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center bg-white shadow-lg flex-shrink-0">
                <img
                  src="/hospital-logo.png"
                  alt="PMNH"
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    const t = e.currentTarget
                    t.onerror = null
                    t.src = '/hospital-logo.svg'
                  }}
                />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">
                  Health & Nursing Research Unit
                </h1>
                <p className="text-blue-200 text-sm">
                  Prince Mohammed Bin Nasser Hospital · Jazan, Saudi Arabia
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="badge bg-white/20 text-white border-white/30 flex items-center gap-1.5">
                <Globe className="w-3 h-3" />
                Public Research Portal
              </span>
              <Link href="/login"
                className="flex items-center gap-2 bg-white text-blue-800 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors shadow-sm">
                Staff Login <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="gradient-header py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-blue-300 text-sm font-semibold uppercase tracking-widest mb-3">Research Excellence</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Published Research & Clinical Studies
            </h2>
            <p className="text-blue-200 text-base max-w-2xl mx-auto">
              Explore the research contributions of Prince Mohammed Bin Nasser Hospital, Jazan.
              This public portal provides access to approved and published research from our departments.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center gap-8 mt-10"
          >
            {[
              { label: 'Published Papers', value: DEMO_STATS.published_papers },
              { label: 'Research Projects', value: publicResearch.length },
              { label: 'Departments', value: DEMO_STATS.total_departments },
              { label: 'Q1 Publications', value: DEMO_STATS.q1_publications },
            ].map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="text-center">
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="text-blue-300 text-xs mt-1">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Main content */}
      <div className="bg-healthcare-light min-h-screen py-8 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Search & filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card p-4 mb-6 flex flex-wrap gap-3"
          >
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search publications by title, journal, keyword..."
                className="form-input pl-9" />
            </div>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="form-input w-auto">
              <option value="all">All Departments</option>
              {DEMO_DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="form-input w-auto">
              <option value="all">All Years</option>
              {['2026','2025','2024','2023'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Filter className="w-4 h-4" />
              {filtered.length} results
            </div>
          </motion.div>

          {/* Research list or detail */}
          {selected && selectedResearch ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <button onClick={() => setSelected(null)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-4 font-medium">
                <ArrowLeft className="w-4 h-4" />
                Back to research list
              </button>
              <div className="premium-card p-6 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{selectedResearch.research_id}</span>
                    {selectedResearch.journal_quartile !== 'not_indexed' && (
                      <span className={cn('badge text-xs', getStatusBadgeClass(selectedResearch.journal_quartile))}>{selectedResearch.journal_quartile}</span>
                    )}
                    {selectedResearch.is_open_access && (
                      <span className="badge bg-green-100 text-green-700 border-green-200 flex items-center gap-1 text-xs">
                        <Globe className="w-3 h-3" /> Open Access
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedResearch.title}</h2>
                </div>

                {selectedResearch.abstract && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Abstract</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedResearch.abstract}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { label: 'Principal Investigator', value: selectedResearch.principal_investigator_name },
                    { label: 'Department', value: getDeptName(selectedResearch.department_id) },
                    { label: 'Research Category', value: selectedResearch.research_category },
                    { label: 'Publication Date', value: formatDate(selectedResearch.publication_date) },
                    { label: 'Journal', value: selectedResearch.journal_name },
                    { label: 'Indexed In', value: selectedResearch.indexed_database },
                    { label: 'Impact Factor', value: selectedResearch.impact_factor?.toString() },
                    { label: 'Citation Count', value: selectedResearch.citation_count?.toString() },
                  ].filter(f => f.value && f.value !== 'undefined').map(f => (
                    <div key={f.label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase">{f.label}</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{f.value}</p>
                    </div>
                  ))}
                </div>

                {selectedResearch.doi && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Publication DOI</p>
                      <a href={`https://doi.org/${selectedResearch.doi}`} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        {selectedResearch.doi} <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
                  <strong>Note:</strong> This is a public summary only. Full research data, confidential information,
                  patient data, budget details, and internal documents are not accessible in the public portal.
                  For research collaboration enquiries, contact the PMNH Research Unit.
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="premium-card p-16 text-center">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-semibold">No public research matches your search</p>
                  <p className="text-gray-400 text-sm mt-1">Try different keywords or filters</p>
                </div>
              ) : (
                filtered.map((r, i) => (
                  <motion.div key={r.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="premium-card p-5 hover:shadow-card-hover transition-all cursor-pointer"
                    onClick={() => setSelected(r.id)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{r.research_id}</span>
                          {r.journal_quartile !== 'not_indexed' && (
                            <span className={cn('badge text-xs', getStatusBadgeClass(r.journal_quartile))}>{r.journal_quartile}</span>
                          )}
                          {r.is_open_access && (
                            <span className="badge bg-green-100 text-green-700 border-green-200 flex items-center gap-1 text-xs">
                              <Globe className="w-3 h-3" /> Open Access
                            </span>
                          )}
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{r.indexed_database !== 'not_indexed' ? r.indexed_database : 'N/A'}</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 leading-tight mb-2">{r.title}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{r.principal_investigator_name}</span>
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{getDeptName(r.department_id)}</span>
                          {r.journal_name && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{r.journal_name}</span>}
                          {r.publication_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(r.publication_date)}</span>}
                        </div>
                      </div>
                      <button className="btn-secondary text-sm flex-shrink-0">
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="gradient-header py-8 px-4 mt-0">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Activity className="w-6 h-6 text-blue-300" />
            <div>
              <p className="text-white font-bold">Health & Nursing Research Unit</p>
              <p className="text-blue-200 text-sm">Prince Mohammed Bin Nasser Hospital, Jazan, Saudi Arabia</p>
            </div>
          </div>
          <p className="text-blue-300/60 text-xs mt-4">
            © 2026 PMNH Research Unit · Public Portal · This portal shows only approved public research information
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 mt-3 text-blue-300 hover:text-white text-sm transition-colors">
            Staff Login <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </footer>
    </div>
  )
}
