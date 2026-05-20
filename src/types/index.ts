// ============================================================
// PMNH Jazan Research Portal - TypeScript Types
// ============================================================

export type UserRole =
  | 'admin'
  | 'research_director'
  | 'department_head'
  | 'research_coordinator'
  | 'authorized_staff'
  | 'viewer'

export type ResearchStatus =
  | 'active'
  | 'completed'
  | 'delayed'
  | 'cancelled'
  | 'on_hold'
  | 'pending_approval'

export type WorkflowStage =
  | 'idea_submitted'
  | 'proposal_drafted'
  | 'department_approval'
  | 'ethics_irb_approval'
  | 'data_collection'
  | 'data_analysis'
  | 'manuscript_writing'
  | 'journal_submission'
  | 'revision'
  | 'accepted'
  | 'published'

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'not_required'
export type PublicationStatus =
  | 'not_submitted'
  | 'submitted'
  | 'under_review'
  | 'revision_requested'
  | 'accepted'
  | 'published'
  | 'rejected'
export type JournalQuartile = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'not_indexed'
export type IndexedDatabase = 'Scopus' | 'ISI' | 'PubMed' | 'Other' | 'not_indexed'
export type NotificationType =
  | 'deadline'
  | 'delay'
  | 'approval'
  | 'publication'
  | 'assignment'
  | 'qr_submission'
  | 'system'
  | 'missing_document'
  | 'stage_change'

export interface Profile {
  id: string
  username: string
  full_name: string
  full_name_ar?: string
  email: string
  phone?: string
  role: UserRole
  department_id?: string
  avatar_url?: string
  avatar_type?: string
  is_active: boolean
  email_verified: boolean
  phone_verified: boolean
  last_login?: string
  login_count: number
  created_at: string
  updated_at: string
  department?: Department
}

export interface Department {
  id: string
  name: string
  name_ar?: string
  code: string
  description?: string
  head_user_id?: string
  is_active: boolean
  color: string
  icon: string
  research_count: number
  created_at: string
  updated_at: string
  head?: Profile
}

export interface ResearchProject {
  id: string
  research_id: string
  qr_code_data?: string
  barcode_data?: string
  title: string
  title_ar?: string
  abstract?: string
  keywords?: string[]
  research_category?: string
  department_id?: string
  principal_investigator_id?: string
  principal_investigator_name?: string
  start_date?: string
  expected_completion_date?: string
  actual_completion_date?: string
  status: ResearchStatus
  workflow_stage: WorkflowStage
  priority_level: PriorityLevel
  completion_percentage: number
  irb_approval_status: ApprovalStatus
  irb_approval_date?: string
  irb_approval_number?: string
  department_approval_status: ApprovalStatus
  department_approval_date?: string
  ethics_approval_status: ApprovalStatus
  ethics_approval_date?: string
  funding_source?: string
  budget?: number
  budget_currency: string
  publication_status: PublicationStatus
  journal_name?: string
  journal_submission_date?: string
  journal_acceptance_date?: string
  publication_date?: string
  doi?: string
  publication_link?: string
  impact_factor?: number
  citation_count: number
  journal_quartile: JournalQuartile
  indexed_database: IndexedDatabase
  is_open_access: boolean
  publication_type?: string
  notes?: string
  is_public: boolean
  is_archived: boolean
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at: string
  // Joins
  department?: Department
  principal_investigator?: Profile
  co_investigators?: CoInvestigator[]
  attachments?: ResearchAttachment[]
  qr_codes?: QRCode[]
}

export interface CoInvestigator {
  id: string
  research_id: string
  investigator_id?: string
  investigator_name: string
  investigator_email?: string
  role: string
  order_index: number
  created_at: string
}

export interface WorkflowStageHistory {
  id: string
  research_id: string
  stage: WorkflowStage
  status: string
  started_at?: string
  completed_at?: string
  deadline?: string
  notes?: string
  updated_by?: string
  created_at: string
}

export interface ResearchAttachment {
  id: string
  research_id: string
  file_name: string
  file_type?: string
  file_size?: number
  file_url: string
  storage_path: string
  category?: string
  description?: string
  is_confidential: boolean
  uploaded_by?: string
  download_count: number
  created_at: string
  uploader?: Profile
}

export interface QRCode {
  id: string
  research_id: string
  qr_data: string
  barcode_data?: string
  qr_type: string
  scan_count: number
  last_scanned_at?: string
  is_active: boolean
  created_by?: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  research_id?: string
  priority: string
  is_read: boolean
  read_at?: string
  action_url?: string
  created_at: string
  research?: ResearchProject
}

export interface Report {
  id: string
  title: string
  report_type: string
  description?: string
  parameters?: Record<string, unknown>
  generated_by?: string
  file_url?: string
  file_type?: string
  file_size?: number
  department_id?: string
  date_from?: string
  date_to?: string
  download_count: number
  created_at: string
  generator?: Profile
  department?: Department
}

export interface ActivityLog {
  id: string
  user_id?: string
  user_name?: string
  action: string
  entity_type?: string
  entity_id?: string
  entity_name?: string
  description?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
  user?: Profile
}

export interface DashboardStats {
  total_projects: number
  active_projects: number
  completed_projects: number
  published_papers: number
  delayed_projects: number
  pending_irb: number
  upcoming_deadlines: number
  total_departments: number
  total_users: number
  this_month_new: number
  funded_projects: number
  total_budget: number
  q1_publications: number
  q2_publications: number
  q3_publications: number
  q4_publications: number
  open_access_count: number
}

export interface AIInsight {
  id: string
  type: 'warning' | 'recommendation' | 'success' | 'info'
  title: string
  message: string
  action?: string
  research_id?: string
  department_id?: string
  score?: number
  created_at: string
}

// Workflow stage labels
export const WORKFLOW_STAGES: Record<WorkflowStage, { label: string; color: string; icon: string; order: number }> = {
  idea_submitted: { label: 'Idea Submitted', color: '#6366f1', icon: 'lightbulb', order: 1 },
  proposal_drafted: { label: 'Proposal Drafted', color: '#8b5cf6', icon: 'file-text', order: 2 },
  department_approval: { label: 'Department Approval', color: '#06b6d4', icon: 'building-2', order: 3 },
  ethics_irb_approval: { label: 'Ethics/IRB Approval', color: '#f59e0b', icon: 'shield-check', order: 4 },
  data_collection: { label: 'Data Collection', color: '#10b981', icon: 'database', order: 5 },
  data_analysis: { label: 'Data Analysis', color: '#3b82f6', icon: 'bar-chart-2', order: 6 },
  manuscript_writing: { label: 'Manuscript Writing', color: '#6366f1', icon: 'pen-tool', order: 7 },
  journal_submission: { label: 'Journal Submission', color: '#ec4899', icon: 'send', order: 8 },
  revision: { label: 'Revision', color: '#f97316', icon: 'refresh-cw', order: 9 },
  accepted: { label: 'Accepted', color: '#22c55e', icon: 'check-circle', order: 10 },
  published: { label: 'Published', color: '#16a34a', icon: 'book-open', order: 11 },
}

export const STATUS_COLORS: Record<ResearchStatus, string> = {
  active: '#22c55e',
  completed: '#3b82f6',
  delayed: '#f97316',
  cancelled: '#ef4444',
  on_hold: '#6b7280',
  pending_approval: '#f59e0b',
}

export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  low: '#6b7280',
  medium: '#3b82f6',
  high: '#f97316',
  critical: '#ef4444',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  research_director: 'Research Director',
  department_head: 'Department Head',
  research_coordinator: 'Research Coordinator',
  authorized_staff: 'Authorized Staff',
  viewer: 'Viewer / Visitor',
}

export const RESEARCH_CATEGORIES = [
  'Clinical Research',
  'Basic Science',
  'Epidemiology',
  'Public Health',
  'Nursing Research',
  'Pharmaceutical Research',
  'Medical Education',
  'Health Services Research',
  'Community Health',
  'Translational Research',
  'Quality Improvement',
  'Case Study',
  'Systematic Review',
  'Meta-Analysis',
  'Other',
]
