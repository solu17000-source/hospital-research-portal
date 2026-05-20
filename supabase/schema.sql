
-- ============================================================
-- PMNH Jazan Research Portal - PostgreSQL Database Schema
-- Health and Nursing Research Unit
-- Prince Mohammed Bin Nasser Hospital, Jazan, Saudi Arabia
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'admin', 'research_director', 'department_head',
  'research_coordinator', 'authorized_staff', 'viewer'
);

CREATE TYPE research_status AS ENUM (
  'active', 'completed', 'delayed', 'cancelled', 'on_hold', 'pending_approval'
);

CREATE TYPE workflow_stage AS ENUM (
  'idea_submitted', 'proposal_drafted', 'department_approval',
  'ethics_irb_approval', 'data_collection', 'data_analysis',
  'manuscript_writing', 'journal_submission', 'revision',
  'accepted', 'published'
);

CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'not_required');

CREATE TYPE publication_status AS ENUM (
  'not_submitted', 'submitted', 'under_review', 'revision_requested',
  'accepted', 'published', 'rejected'
);

CREATE TYPE journal_quartile AS ENUM ('Q1', 'Q2', 'Q3', 'Q4', 'not_indexed');

CREATE TYPE indexed_database AS ENUM ('Scopus', 'ISI', 'PubMed', 'Other', 'not_indexed');

CREATE TYPE notification_type AS ENUM (
  'deadline', 'delay', 'approval', 'publication', 'assignment',
  'qr_submission', 'system', 'missing_document', 'stage_change'
);

CREATE TYPE activity_action AS ENUM (
  'login', 'logout', 'create', 'update', 'delete', 'download',
  'upload', 'qr_scan', 'permission_change', 'password_change', 'view'
);

-- ============================================================
-- DEPARTMENTS
-- ============================================================

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  head_user_id UUID,
  is_active BOOLEAN DEFAULT true,
  color VARCHAR(7) DEFAULT '#2563eb',
  icon VARCHAR(50) DEFAULT 'building',
  research_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed departments
INSERT INTO departments (name, code, color) VALUES
  ('Internal Medicine', 'INT-MED', '#2563eb'),
  ('Surgery', 'SURG', '#dc2626'),
  ('Pediatrics', 'PEDI', '#16a34a'),
  ('Emergency', 'EMRG', '#ea580c'),
  ('ICU', 'ICU', '#7c3aed'),
  ('Radiology', 'RADI', '#0891b2'),
  ('Pharmacy', 'PHRM', '#65a30d'),
  ('Nursing', 'NURS', '#e11d48'),
  ('Laboratory', 'LAB', '#d97706'),
  ('Cardiology', 'CARD', '#dc2626'),
  ('Neurology', 'NEUR', '#7c3aed'),
  ('Orthopedics', 'ORTH', '#0d9488'),
  ('OB/GYN', 'OBGYN', '#c026d3'),
  ('Administration', 'ADMIN', '#475569');

-- ============================================================
-- USERS & PROFILES
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  full_name_ar VARCHAR(200),
  email VARCHAR(200) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role user_role NOT NULL DEFAULT 'authorized_staff',
  department_id UUID REFERENCES departments(id),
  avatar_url TEXT,
  avatar_type VARCHAR(20) DEFAULT 'upload',
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  login_count INT DEFAULT 0,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(20) DEFAULT 'email',
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  email VARCHAR(200),
  otp_code VARCHAR(6) NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RESEARCH PROJECTS
-- ============================================================

CREATE TABLE research_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  research_id VARCHAR(30) UNIQUE NOT NULL,
  qr_code_data TEXT,
  barcode_data TEXT,

  -- Basic Info
  title VARCHAR(500) NOT NULL,
  title_ar VARCHAR(500),
  abstract TEXT,
  keywords TEXT[],
  research_category VARCHAR(100),
  department_id UUID REFERENCES departments(id),

  -- Investigators
  principal_investigator_id UUID REFERENCES profiles(id),
  principal_investigator_name VARCHAR(200),

  -- Dates
  start_date DATE,
  expected_completion_date DATE,
  actual_completion_date DATE,

  -- Status & Priority
  status research_status DEFAULT 'active',
  workflow_stage workflow_stage DEFAULT 'idea_submitted',
  priority_level priority_level DEFAULT 'medium',
  completion_percentage INT DEFAULT 0,

  -- Approvals
  irb_approval_status approval_status DEFAULT 'pending',
  irb_approval_date DATE,
  irb_approval_number VARCHAR(100),
  department_approval_status approval_status DEFAULT 'pending',
  department_approval_date DATE,
  ethics_approval_status approval_status DEFAULT 'pending',
  ethics_approval_date DATE,

  -- Funding
  funding_source VARCHAR(200),
  budget DECIMAL(15,2),
  budget_currency VARCHAR(10) DEFAULT 'SAR',

  -- Publication
  publication_status publication_status DEFAULT 'not_submitted',
  journal_name VARCHAR(300),
  journal_submission_date DATE,
  journal_acceptance_date DATE,
  publication_date DATE,
  doi VARCHAR(200),
  publication_link TEXT,
  impact_factor DECIMAL(6,3),
  citation_count INT DEFAULT 0,
  journal_quartile journal_quartile DEFAULT 'not_indexed',
  indexed_database indexed_database DEFAULT 'not_indexed',
  is_open_access BOOLEAN DEFAULT false,
  publication_type VARCHAR(100),

  -- Meta
  notes TEXT,
  is_public BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research ID sequence trigger
CREATE SEQUENCE IF NOT EXISTS research_id_seq START 1000;

CREATE OR REPLACE FUNCTION generate_research_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.research_id IS NULL OR NEW.research_id = '' THEN
    NEW.research_id := 'PMNH-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('research_id_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_research_id
  BEFORE INSERT ON research_projects
  FOR EACH ROW EXECUTE FUNCTION generate_research_id();

-- ============================================================
-- CO-INVESTIGATORS
-- ============================================================

CREATE TABLE research_co_investigators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  research_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  investigator_id UUID REFERENCES profiles(id),
  investigator_name VARCHAR(200) NOT NULL,
  investigator_email VARCHAR(200),
  role VARCHAR(100) DEFAULT 'Co-Investigator',
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORKFLOW STAGES HISTORY
-- ============================================================

CREATE TABLE workflow_stage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  research_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  stage workflow_stage NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deadline DATE,
  notes TEXT,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATTACHMENTS / FILES
-- ============================================================

CREATE TABLE research_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  research_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  file_name VARCHAR(300) NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  category VARCHAR(100),
  description TEXT,
  is_confidential BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES profiles(id),
  download_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QR CODES / BARCODES
-- ============================================================

CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  research_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
  qr_data TEXT UNIQUE NOT NULL,
  barcode_data TEXT,
  qr_type VARCHAR(20) DEFAULT 'project',
  scan_count INT DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  last_scanned_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE qr_scan_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id UUID REFERENCES qr_codes(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES profiles(id),
  scan_ip VARCHAR(45),
  scan_device TEXT,
  action_taken VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  message TEXT NOT NULL,
  type notification_type DEFAULT 'system',
  research_id UUID REFERENCES research_projects(id) ON DELETE SET NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REPORTS
-- ============================================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  description TEXT,
  parameters JSONB,
  generated_by UUID REFERENCES profiles(id),
  file_url TEXT,
  file_type VARCHAR(20),
  file_size BIGINT,
  department_id UUID REFERENCES departments(id),
  date_from DATE,
  date_to DATE,
  is_scheduled BOOLEAN DEFAULT false,
  schedule_cron VARCHAR(100),
  download_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name VARCHAR(200),
  action activity_action NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  entity_name VARCHAR(300),
  description TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================

CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  value_json JSONB,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  is_public BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed system settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
  ('hospital_name', 'Prince Mohammed Bin Nasser Hospital', 'Hospital official name', 'branding', true),
  ('hospital_name_ar', 'مستشفى الأمير محمد بن ناصر', 'Hospital name in Arabic', 'branding', true),
  ('hospital_location', 'Jazan, Kingdom of Saudi Arabia', 'Hospital location', 'branding', true),
  ('portal_name', 'Health and Nursing Research Unit', 'Portal system name', 'branding', true),
  ('admin_email', 'research@pmnh.gov.sa', 'Admin contact email', 'contact', false),
  ('session_timeout', '60', 'Session timeout in minutes', 'security', false),
  ('max_login_attempts', '5', 'Max failed login attempts before lockout', 'security', false),
  ('lockout_duration', '30', 'Account lockout duration in minutes', 'security', false),
  ('enable_email_notifications', 'true', 'Enable email notifications', 'notifications', false),
  ('enable_sms_notifications', 'false', 'Enable SMS notifications', 'notifications', false),
  ('deadline_warning_days', '7', 'Days before deadline to send warning', 'notifications', false);

-- ============================================================
-- BACKUP RECORDS
-- ============================================================

CREATE TABLE backup_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_name VARCHAR(200) NOT NULL,
  backup_type VARCHAR(50) DEFAULT 'manual',
  file_url TEXT,
  file_size BIGINT,
  tables_included TEXT[],
  status VARCHAR(20) DEFAULT 'completed',
  initiated_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_research_projects_department ON research_projects(department_id);
CREATE INDEX idx_research_projects_status ON research_projects(status);
CREATE INDEX idx_research_projects_workflow ON research_projects(workflow_stage);
CREATE INDEX idx_research_projects_principal ON research_projects(principal_investigator_id);
CREATE INDEX idx_research_projects_created ON research_projects(created_at);
CREATE INDEX idx_research_projects_public ON research_projects(is_public);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX idx_attachments_research ON research_attachments(research_id);
CREATE INDEX idx_qr_codes_research ON qr_codes(research_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_research_projects_updated_at
  BEFORE UPDATE ON research_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles but only update their own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT WITH CHECK (true);

-- Research: Viewers can only see public research
CREATE POLICY "research_select_public" ON research_projects
  FOR SELECT USING (is_public = true OR auth.uid() IS NOT NULL);

CREATE POLICY "research_insert_staff" ON research_projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "research_update_staff" ON research_projects
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Notifications: Users can only see their own
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- DEMO SEED DATA
-- ============================================================

-- Note: Seed data requires profiles to be inserted after auth users are created
-- Run the seed-demo-data.sql file after setting up authentication
