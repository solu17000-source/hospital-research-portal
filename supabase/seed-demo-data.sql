-- ============================================================
-- PMNH Jazan Research Portal - Demo Seed Data
-- Run this AFTER setting up authentication users in Supabase
-- ============================================================

-- Create admin user profile (requires auth user to exist first)
-- First create in Supabase Auth dashboard, then run this:

INSERT INTO profiles (id, username, full_name, email, role, is_active, email_verified, phone_verified, login_count)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'research-unit PMNH', 'Dr. Ahmed Al-Qahtani', 'admin@pmnh.gov.sa', 'admin', true, true, true, 1),
  ('00000000-0000-0000-0000-000000000002', 'dr.fatima.director', 'Dr. Fatima Al-Zahrani', 'director@pmnh.gov.sa', 'research_director', true, true, true, 1),
  ('00000000-0000-0000-0000-000000000003', 'dr.khalid.surgery', 'Dr. Khalid Al-Ghamdi', 'khalid@pmnh.gov.sa', 'department_head', true, true, false, 1),
  ('00000000-0000-0000-0000-000000000004', 'sara.coordinator', 'Sara Al-Malki', 'sara@pmnh.gov.sa', 'research_coordinator', true, true, true, 1)
ON CONFLICT DO NOTHING;

-- Insert demo research projects
INSERT INTO research_projects (
  research_id, title, research_category, department_id,
  principal_investigator_name, start_date, expected_completion_date,
  status, workflow_stage, priority_level, completion_percentage,
  irb_approval_status, department_approval_status, ethics_approval_status,
  funding_source, budget, publication_status, journal_name,
  publication_date, doi, impact_factor, citation_count,
  journal_quartile, indexed_database, is_open_access, is_public,
  created_by
)
SELECT
  'PMNH-2024-0001',
  'Assessment of Hypertension Management Protocols in ICU Patients',
  'Clinical Research',
  (SELECT id FROM departments WHERE code = 'ICU'),
  'Dr. Ahmed Al-Qahtani',
  '2024-01-15', '2025-01-15',
  'completed', 'published', 'high', 100,
  'approved', 'approved', 'approved',
  'Ministry of Health', 85000,
  'published', 'Saudi Medical Journal',
  '2025-02-10', '10.2471/BLT.24.001234', 2.4, 5,
  'Q2', 'Scopus', true, true,
  '00000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (SELECT 1 FROM research_projects WHERE research_id = 'PMNH-2024-0001');

-- Additional research projects...
-- (Continued from demo-data.ts)
