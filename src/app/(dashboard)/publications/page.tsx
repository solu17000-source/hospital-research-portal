'use client'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ExternalLink, Search, Filter, Download, Star, Globe, TrendingUp, BarChart2 } from 'lucide-react'
import { useResearch } from '@/lib/data-source'
import { cn, formatDate, getStatusBadgeClass } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const QUARTILE_COLORS: Record<string, string> = {
  Q1: '#7c3aed', Q2: '#2563eb', Q3: '#0891b2', Q4: '#6b7280', not_indexed: '#e5e7eb'
}

export default function PublicationsPage() {
  const [search, setSearch] = useState('')
  const [quartileFilter, setQuartileFilter] = useState('all')
  const [dbFilter, setDbFilter] = useState('all')

  // Pull every research row from Supabase, then filter to the ones that are
  // actually published. When the live query is in flight we render zeros
  // instead of fabricated demo numbers.
  const { data: researchData } = useResearch()
  const published = useMemo(
    () => (researchData ?? []).filter(r => r.publication_status === 'published'),
    [researchData],
  )

  const filtered = useMemo(() => {
    return published.filter(r => {
      const q = search.toLowerCase()
      const matchSearch = !search || r.title.toLowerCase().includes(q) || r.journal_name?.toLowerCase().includes(q) || r.doi?.includes(q)
      const matchQ = quartileFilter === 'all' || r.journal_quartile === quartileFilter
      const matchDb = dbFilter === 'all' || r.indexed_database === dbFilter
      return matchSearch && matchQ && matchDb
    })
  }, [published, search, quartileFilter, dbFilter])

  const quartileCounts = useMemo(() => ({
    Q1: published.filter(r => r.journal_quartile === 'Q1').length,
    Q2: published.filter(r => r.journal_quartile === 'Q2').length,
    Q3: published.filter(r => r.journal_quartile === 'Q3').length,
    Q4: published.filter(r => r.journal_quartile === 'Q4').length,
  }), [published])

  const dbCounts = useMemo(() => [
    { name: 'Scopus', value: published.filter(r => r.indexed_database === 'Scopus').length, color: '#2563eb' },
    { name: 'ISI', value: published.filter(r => r.indexed_database === 'ISI').length, color: '#7c3aed' },
    { name: 'PubMed', value: published.filter(r => r.indexed_database === 'PubMed').length, color: '#16a34a' },
    { name: 'Other', value: published.filter(r => r.indexed_database === 'Other').length, color: '#6b7280' },
  ], [published])

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Publications
          </h1>
          <p className="page-subtitle">{published.length} published papers from PMNH research unit</p>
        </div>
        <button className="btn-secondary text-sm">
          <Download className="w-4 h-4" />
          Export Publications
        </button>
      </div>

      {/* Publication analytics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Published', value: published.length, color: 'blue', icon: BookOpen },
          { label: 'Q1 Journals', value: quartileCounts.Q1, color: 'purple', icon: Star },
          { label: 'Open Access', value: published.filter(r => r.is_open_access).length, color: 'green', icon: Globe },
          { label: 'Avg Impact Factor', value: (published.reduce((a, r) => a + (r.impact_factor || 0), 0) / published.length).toFixed(1), color: 'orange', icon: TrendingUp },
        ].map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={cn('premium-card p-4 flex items-center gap-3',
              s.color === 'blue' && 'border-l-4 border-l-blue-500',
              s.color === 'purple' && 'border-l-4 border-l-purple-500',
              s.color === 'green' && 'border-l-4 border-l-green-500',
              s.color === 'orange' && 'border-l-4 border-l-orange-500',
            )}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
              s.color === 'blue' && 'bg-blue-100',
              s.color === 'purple' && 'bg-purple-100',
              s.color === 'green' && 'bg-green-100',
              s.color === 'orange' && 'bg-orange-100',
            )}>
              <s.icon className={cn('w-5 h-5',
                s.color === 'blue' && 'text-blue-600',
                s.color === 'purple' && 'text-purple-600',
                s.color === 'green' && 'text-green-600',
                s.color === 'orange' && 'text-orange-600',
              )} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="premium-card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Journal Quartile Distribution</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={Object.entries(quartileCounts).map(([name, value]) => ({ name, value, color: QUARTILE_COLORS[name] }))}
                  cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                  {Object.entries(quartileCounts).map(([name], i) => (
                    <Cell key={i} fill={QUARTILE_COLORS[name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {Object.entries(quartileCounts).map(([q, count]) => (
                <div key={q} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ background: QUARTILE_COLORS[q] }}>{q}</div>
                  <span className="text-sm text-gray-600">{count} papers</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="premium-card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Indexing Database</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dbCounts.filter(d => d.value > 0)} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {dbCounts.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="premium-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, journal, DOI..."
            className="form-input pl-9" />
        </div>
        <select value={quartileFilter} onChange={e => setQuartileFilter(e.target.value)} className="form-input w-auto">
          <option value="all">All Quartiles</option>
          <option value="Q1">Q1</option>
          <option value="Q2">Q2</option>
          <option value="Q3">Q3</option>
          <option value="Q4">Q4</option>
        </select>
        <select value={dbFilter} onChange={e => setDbFilter(e.target.value)} className="form-input w-auto">
          <option value="all">All Databases</option>
          <option value="Scopus">Scopus</option>
          <option value="ISI">ISI</option>
          <option value="PubMed">PubMed</option>
        </select>
      </div>

      {/* Publications list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No publications match your filters</p>
          </div>
        ) : (
          filtered.map((r, i) => (
            <motion.div key={r.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="premium-card p-5 hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{r.research_id}</span>
                    <span className={cn('badge text-xs', getStatusBadgeClass(r.journal_quartile))}>{r.journal_quartile}</span>
                    {r.is_open_access && (
                      <span className="badge bg-green-100 text-green-700 border-green-200 flex items-center gap-1 text-xs">
                        <Globe className="w-3 h-3" /> Open Access
                      </span>
                    )}
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{r.indexed_database}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-2">{r.title}</h3>
                  <p className="text-xs text-gray-500 mb-1">
                    <strong>Journal:</strong> {r.journal_name}
                    {r.impact_factor && <span className="ml-3"><strong>IF:</strong> {r.impact_factor}</span>}
                    {r.citation_count > 0 && <span className="ml-3"><strong>Citations:</strong> {r.citation_count}</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    <strong>Published:</strong> {formatDate(r.publication_date)}
                    {r.principal_investigator_name && <span className="ml-3"><strong>PI:</strong> {r.principal_investigator_name}</span>}
                  </p>
                  {r.doi && (
                    <p className="text-xs text-blue-600 mt-1">
                      <strong>DOI:</strong> {r.doi}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {r.doi && (
                    <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary text-xs">
                      <ExternalLink className="w-3.5 h-3.5" />
                      View
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
