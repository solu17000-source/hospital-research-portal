'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Save, FlaskConical, User,
  Building2, Calendar, Shield, DollarSign, BookOpen,
  FileText, CheckCircle, AlertCircle, RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createResearch, useDepartments, type ResearchInput } from '@/lib/data-source'
import { useAuthStore } from '@/lib/auth-store'
import type { Department } from '@/types'
import { RESEARCH_CATEGORIES, WORKFLOW_STAGES, type ApprovalStatus,
  type JournalQuartile, type IndexedDatabase, type PriorityLevel,
  type WorkflowStage } from '@/types'

const STEPS = [
  { id: 1, label: 'Basic Info', icon: FlaskConical },
  { id: 2, label: 'Investigators', icon: User },
  { id: 3, label: 'Department', icon: Building2 },
  { id: 4, label: 'Timeline', icon: Calendar },
  { id: 5, label: 'Approvals', icon: Shield },
  { id: 6, label: 'Funding', icon: DollarSign },
  { id: 7, label: 'Publication', icon: BookOpen },
  { id: 8, label: 'Review', icon: CheckCircle },
]

export default function NewResearchPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  // Live department list — real Supabase UUIDs. Critical: without this
  // the dropdown emits short demo ids like "d4" that the Supabase `uuid`
  // column rejects on insert.
  //
  // `loading` and `refetch` are surfaced into the dropdown UX so an
  // intermittent fetch failure (expired JWT, brief network blip, stale
  // tab open from before a DB migration ran) is visible to the user with
  // a one-click recovery, instead of leaving them looking at an empty
  // <select> and wondering why their freshly-seeded 19 rows are missing.
  const { data: deptData, loading: deptLoading, refetch: refetchDepartments } = useDepartments()
  const departments: Department[] = deptData ?? []

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    title_ar: '',
    abstract: '',
    keywords: '',
    research_category: '',
    department_id: '',
    principal_investigator_name: '',
    co_investigators: '',
    start_date: '',
    expected_completion_date: '',
    workflow_stage: 'idea_submitted',
    priority_level: 'medium',
    irb_approval_status: 'pending',
    department_approval_status: 'pending',
    ethics_approval_status: 'pending',
    irb_approval_number: '',
    funding_source: '',
    budget: '',
    budget_currency: 'SAR',
    notes: '',
    journal_name: '',
    journal_quartile: 'not_indexed',
    indexed_database: 'not_indexed',
    is_open_access: false,
    is_public: false,
  })

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Research title is required'); return }
    if (!form.department_id) { toast.error('Department is required'); return }

    setSaving(true)
    // Shape the wizard's flat form state into the typed write input.
    const payload: ResearchInput = {
      title: form.title.trim(),
      title_ar: form.title_ar.trim() || undefined,
      abstract: form.abstract.trim() || undefined,
      // Free-text "keyword, keyword, keyword" → string[] for the schema.
      keywords: form.keywords
        ? form.keywords.split(/[,،]/).map(k => k.trim()).filter(Boolean)
        : undefined,
      research_category: form.research_category || undefined,
      department_id: form.department_id,
      principal_investigator_name: form.principal_investigator_name.trim() || undefined,
      start_date: form.start_date || undefined,
      expected_completion_date: form.expected_completion_date || undefined,
      workflow_stage: form.workflow_stage as WorkflowStage,
      priority_level: form.priority_level as PriorityLevel,
      irb_approval_status: form.irb_approval_status as ApprovalStatus,
      irb_approval_number: form.irb_approval_number.trim() || undefined,
      department_approval_status: form.department_approval_status as ApprovalStatus,
      ethics_approval_status: form.ethics_approval_status as ApprovalStatus,
      funding_source: form.funding_source.trim() || undefined,
      budget: form.budget ? Number(form.budget) || undefined : undefined,
      budget_currency: form.budget_currency,
      journal_name: form.journal_name.trim() || undefined,
      journal_quartile: form.journal_quartile as JournalQuartile,
      indexed_database: form.indexed_database as IndexedDatabase,
      is_open_access: !!form.is_open_access,
      is_public: !!form.is_public,
      notes: form.notes.trim() || undefined,
      created_by: user?.id,
    }

    const result = await createResearch(payload)
    setSaving(false)

    if (!result.ok) {
      toast.error(result.error || 'Could not save research project')
      return
    }

    toast.success(`${result.row.research_id} created — saved to database. Redirecting…`)
    // Small delay so the user sees the toast before the route swap.
    setTimeout(() => router.push(`/research/${result.row.id}`), 900)
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/research" className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="page-title">Add New Research Project</h1>
          <p className="page-subtitle">Complete all required fields to register a new research study</p>
        </div>
      </div>

      {/* Progress */}
      <div className="premium-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">Step {step} of {STEPS.length}</span>
          <span className="text-sm text-gray-500">{STEPS[step - 1].label}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
            animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
        {/* Step indicators */}
        <div className="flex justify-between mt-3">
          {STEPS.map(s => (
            <button key={s.id} onClick={() => setStep(s.id)}
              className="flex flex-col items-center gap-1 group">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${s.id < step ? 'bg-green-500' : s.id === step ? 'bg-blue-600' : 'bg-gray-200'}`}>
                {s.id < step ? <CheckCircle className="w-4 h-4 text-white" /> : <s.icon className={`w-3.5 h-3.5 ${s.id === step ? 'text-white' : 'text-gray-400'}`} />}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${s.id === step ? 'text-blue-600' : 'text-gray-400'}`}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Form steps */}
      <div className="premium-card p-6">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Basic Research Information</h2>
              <div>
                <label className="form-label">Research Title (English) *</label>
                <input value={form.title} onChange={e => set('title', e.target.value)}
                  placeholder="Enter the full research title in English"
                  className="form-input" />
              </div>
              <div>
                <label className="form-label">Research Title (Arabic)</label>
                <input value={form.title_ar} onChange={e => set('title_ar', e.target.value)}
                  placeholder="أدخل عنوان البحث بالعربية"
                  dir="rtl" className="form-input" />
              </div>
              <div>
                <label className="form-label">Abstract / Summary</label>
                <textarea value={form.abstract} onChange={e => set('abstract', e.target.value)}
                  placeholder="Provide a brief summary of the research objectives and methodology..."
                  rows={4} className="form-input resize-none" />
              </div>
              <div>
                <label className="form-label">Research Category *</label>
                <select value={form.research_category} onChange={e => set('research_category', e.target.value)}
                  className="form-input">
                  <option value="">Select research category</option>
                  {RESEARCH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Keywords</label>
                <input value={form.keywords} onChange={e => set('keywords', e.target.value)}
                  placeholder="Comma-separated keywords (e.g., hypertension, ICU, outcomes)"
                  className="form-input" />
                <p className="text-xs text-gray-400 mt-1">Separate keywords with commas</p>
              </div>
              <div>
                <label className="form-label">Initial Workflow Stage</label>
                <select value={form.workflow_stage} onChange={e => set('workflow_stage', e.target.value)}
                  className="form-input">
                  {Object.entries(WORKFLOW_STAGES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Investigators */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Research Investigators</h2>
              <div>
                <label className="form-label">Principal Investigator *</label>
                <input value={form.principal_investigator_name} onChange={e => set('principal_investigator_name', e.target.value)}
                  placeholder="Full name of the Principal Investigator"
                  className="form-input" />
              </div>
              <div>
                <label className="form-label">Co-Investigators</label>
                <textarea value={form.co_investigators} onChange={e => set('co_investigators', e.target.value)}
                  placeholder="List co-investigators (one per line): Name - Role&#10;Dr. Example Name - Co-Investigator"
                  rows={4} className="form-input resize-none" />
                <p className="text-xs text-gray-400 mt-1">Enter one co-investigator per line</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Investigator Registration</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Investigators must be registered system users. Contact the Admin to create accounts
                      for investigators who are not yet in the system.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Department */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Department Assignment</h2>
              <div>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <label className="form-label !mb-0">
                    Department *
                    <span className="ms-2 text-[11px] font-normal text-gray-400 tabular-nums">
                      {deptLoading
                        ? 'Loading…'
                        : `${departments.length} option${departments.length === 1 ? '' : 's'} live from Supabase`}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => refetchDepartments()}
                    title="Refresh department list"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                    disabled={deptLoading}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${deptLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                <select
                  value={form.department_id}
                  onChange={e => set('department_id', e.target.value)}
                  className="form-input"
                  disabled={deptLoading}
                >
                  <option value="">
                    {deptLoading ? 'Loading departments…' : 'Select the research department'}
                  </option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {!deptLoading && departments.length === 0 && (
                  <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <p className="font-semibold">No departments returned from Supabase.</p>
                      <p className="mt-0.5">
                        If you just ran a migration, hard-refresh the page (Ctrl+Shift+R).
                        If the issue persists, sign out and back in — your session token may have expired.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">Priority Level</label>
                <div className="grid grid-cols-2 gap-3">
                  {['low','medium','high','critical'].map(p => (
                    <button key={p} type="button" onClick={() => set('priority_level', p)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all capitalize ${
                        form.priority_level === p
                          ? p === 'low' ? 'border-gray-400 bg-gray-50' :
                            p === 'medium' ? 'border-blue-400 bg-blue-50' :
                            p === 'high' ? 'border-orange-400 bg-orange-50' :
                            'border-red-400 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className={`w-3 h-3 rounded-full ${
                        p === 'low' ? 'bg-gray-400' :
                        p === 'medium' ? 'bg-blue-500' :
                        p === 'high' ? 'bg-orange-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium text-sm text-gray-700">{p}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Research Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Internal notes, special considerations, background context..."
                  rows={4} className="form-input resize-none" />
              </div>
            </div>
          )}

          {/* Step 4: Timeline */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Research Timeline</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                    className="form-input" />
                </div>
                <div>
                  <label className="form-label">Expected Completion Date</label>
                  <input type="date" value={form.expected_completion_date} onChange={e => set('expected_completion_date', e.target.value)}
                    className="form-input" />
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800">Timeline Guidelines</p>
                <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Allow adequate time for each workflow stage</li>
                  <li>IRB approval typically takes 4–8 weeks</li>
                  <li>Data collection duration depends on study design</li>
                  <li>Journal review process takes 2–6 months</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 5: Approvals */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Approval Status</h2>
              {[
                { key: 'irb_approval_status', label: 'IRB (Institutional Review Board) Approval', required: true },
                { key: 'department_approval_status', label: 'Department Approval', required: true },
                { key: 'ethics_approval_status', label: 'Ethics Committee Approval', required: false },
              ].map(approval => (
                <div key={approval.key} className="p-4 border border-gray-200 rounded-xl">
                  <label className="form-label">{approval.label} {approval.required && '*'}</label>
                  <div className="flex gap-3 mt-2">
                    {['pending','approved','rejected','not_required'].map(s => (
                      <button key={s} type="button"
                        onClick={() => set(approval.key, s)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all capitalize',
                          (form as Record<string,unknown>)[approval.key] === s
                            ? s === 'approved' ? 'bg-green-100 border-green-400 text-green-700' :
                              s === 'rejected' ? 'bg-red-100 border-red-400 text-red-700' :
                              s === 'pending' ? 'bg-yellow-100 border-yellow-400 text-yellow-700' :
                              'bg-gray-100 border-gray-400 text-gray-700'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        )}>
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                  {approval.key === 'irb_approval_status' && (form as Record<string,unknown>)[approval.key] === 'approved' && (
                    <input value={form.irb_approval_number} onChange={e => set('irb_approval_number', e.target.value)}
                      placeholder="IRB Approval Number (e.g., IRB-2024-001)"
                      className="form-input mt-3" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 6: Funding */}
          {step === 6 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Funding Information</h2>
              <div>
                <label className="form-label">Funding Source</label>
                <input value={form.funding_source} onChange={e => set('funding_source', e.target.value)}
                  placeholder="e.g., Ministry of Health, Hospital Fund, WHO, King Abdulaziz City for Science"
                  className="form-input" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Budget Amount</label>
                  <input type="number" value={form.budget} onChange={e => set('budget', e.target.value)}
                    placeholder="0.00" className="form-input" />
                </div>
                <div>
                  <label className="form-label">Currency</label>
                  <select value={form.budget_currency} onChange={e => set('budget_currency', e.target.value)}
                    className="form-input">
                    <option value="SAR">SAR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              {!form.funding_source && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Leave empty if this research has no external funding source.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 7: Publication */}
          {step === 7 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Publication Intent</h2>
              <div>
                <label className="form-label">Target Journal (if known)</label>
                <input value={form.journal_name} onChange={e => set('journal_name', e.target.value)}
                  placeholder="e.g., Saudi Medical Journal, The Lancet"
                  className="form-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Expected Journal Quartile</label>
                  <select value={form.journal_quartile} onChange={e => set('journal_quartile', e.target.value)}
                    className="form-input">
                    <option value="not_indexed">Not Specified</option>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Target Database</label>
                  <select value={form.indexed_database} onChange={e => set('indexed_database', e.target.value)}
                    className="form-input">
                    <option value="not_indexed">Not Specified</option>
                    <option value="Scopus">Scopus</option>
                    <option value="ISI">ISI Web of Science</option>
                    <option value="PubMed">PubMed</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl">
                <input type="checkbox" id="open_access" checked={form.is_open_access}
                  onChange={e => set('is_open_access', e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                <label htmlFor="open_access" className="text-sm text-gray-700 font-medium">
                  This research is intended for Open Access publication
                </label>
              </div>
              <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl">
                <input type="checkbox" id="is_public" checked={form.is_public}
                  onChange={e => set('is_public', e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                <label htmlFor="is_public" className="text-sm text-gray-700 font-medium">
                  Make this research visible in the Public Visitor Portal
                </label>
              </div>
            </div>
          )}

          {/* Step 8: Review */}
          {step === 8 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Review & Submit</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Title', value: form.title || '—' },
                  { label: 'Category', value: form.research_category || '—' },
                  { label: 'Principal Investigator', value: form.principal_investigator_name || '—' },
                  { label: 'Department', value: departments.find(d => d.id === form.department_id)?.name || '—' },
                  { label: 'Priority', value: form.priority_level },
                  { label: 'Workflow Stage', value: WORKFLOW_STAGES[form.workflow_stage as keyof typeof WORKFLOW_STAGES]?.label || '—' },
                  { label: 'Start Date', value: form.start_date || '—' },
                  { label: 'Expected Completion', value: form.expected_completion_date || '—' },
                  { label: 'IRB Status', value: form.irb_approval_status.replace('_', ' ') },
                  { label: 'Funding Source', value: form.funding_source || 'None specified' },
                  { label: 'Budget', value: form.budget ? `${form.budget} ${form.budget_currency}` : 'Not specified' },
                  { label: 'Target Journal', value: form.journal_name || 'Not specified' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase">{item.label}</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">{item.value}</p>
                  </div>
                ))}
              </div>
              {!form.title && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Please complete the required fields before submitting.
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
          className="btn-secondary disabled:opacity-50">
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        <div className="flex gap-3">
          {step < STEPS.length ? (
            <button onClick={() => setStep(s => Math.min(STEPS.length, s + 1))}
              className="btn-primary">
              Next Step
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving || !form.title}
              className="btn-primary disabled:opacity-60">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4" /> Create Research Project</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
