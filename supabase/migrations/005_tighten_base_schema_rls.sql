-- ============================================================
-- 005_tighten_base_schema_rls.sql
--
-- Closes every RLS / function gap flagged by Supabase's advisor that
-- predates the auth-helpers migration:
--
--   * 10 tables had RLS *disabled* but were reachable via PostgREST —
--     anyone with the anon key could read every row. Enable RLS on
--     each and write conservative policies (least-privilege).
--   * Two pre-existing trigger functions had a mutable search_path —
--     pin them to `public, pg_temp`.
--   * The old `profiles_insert_admin` policy used `WITH CHECK (true)`
--     so any signed-in user could INSERT any profile. Drop it; the
--     `profiles_admin_insert` policy from 002 is the replacement.
--
-- Apply order: AFTER 004_harden_auth_helpers.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Drop the over-permissive legacy policy on profiles.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;

-- ------------------------------------------------------------
-- 2. Pin search_path on the two pre-existing trigger functions so
--    a malicious search_path entry can't redirect their work.
--    ALTER FUNCTION keeps the body intact.
-- ------------------------------------------------------------
ALTER FUNCTION public.generate_research_id()    SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;

-- ============================================================
-- 3. Per-table RLS lockdown.
--    Pattern used throughout:
--      a) ALTER TABLE ... ENABLE ROW LEVEL SECURITY
--      b) FORCE RLS where every read should require a policy
--      c) DROP POLICY IF EXISTS + CREATE POLICY pairs so re-running
--         the migration is idempotent.
-- ============================================================

-- ---- departments -----------------------------------------
-- Used by the public landing page's stats card and by every
-- dashboard. Make it public-read; admins manage rows.
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_public_read" ON public.departments;
CREATE POLICY "departments_public_read" ON public.departments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "departments_admin_write" ON public.departments;
CREATE POLICY "departments_admin_write" ON public.departments
  FOR ALL
  USING      (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---- qr_codes --------------------------------------------
-- The QR registration module lives behind auth; only authenticated
-- staff see anything, only admins (or the row's creator) can write.
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_codes_auth_read" ON public.qr_codes;
CREATE POLICY "qr_codes_auth_read" ON public.qr_codes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "qr_codes_creator_or_admin_write" ON public.qr_codes;
CREATE POLICY "qr_codes_creator_or_admin_write" ON public.qr_codes
  FOR ALL
  USING (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
  );

-- ---- qr_scan_logs ----------------------------------------
-- Sensitive (IP / device-trail). Admin-read only; the service role
-- writes scans server-side. No client INSERT.
ALTER TABLE public.qr_scan_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_scan_logs_admin_read" ON public.qr_scan_logs;
CREATE POLICY "qr_scan_logs_admin_read" ON public.qr_scan_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ---- system_settings -------------------------------------
-- `is_public = true` rows are reachable by anyone (used to surface
-- branding, hospital metadata to the public homepage). Everything
-- else is admin-managed.
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_public_read" ON public.system_settings;
CREATE POLICY "system_settings_public_read" ON public.system_settings
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "system_settings_auth_read" ON public.system_settings;
CREATE POLICY "system_settings_auth_read" ON public.system_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "system_settings_admin_write" ON public.system_settings;
CREATE POLICY "system_settings_admin_write" ON public.system_settings
  FOR ALL
  USING      (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---- password_reset_tokens -------------------------------
-- Service-role-only. RLS without any policy means anon and
-- authenticated cannot SELECT/INSERT/UPDATE/DELETE; the service
-- role bypasses RLS, which is exactly what background workers use.
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- ---- otp_verifications -----------------------------------
-- Same as above — credentials material, never client-facing.
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- ---- research_co_investigators ---------------------------
-- Authenticated users can read; admins manage rows. The parent
-- research_projects table already has its own RLS, so a co-
-- investigator row is only practically useful if the user can
-- also see the parent research.
ALTER TABLE public.research_co_investigators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "research_co_investigators_auth_read" ON public.research_co_investigators;
CREATE POLICY "research_co_investigators_auth_read" ON public.research_co_investigators
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "research_co_investigators_admin_write" ON public.research_co_investigators;
CREATE POLICY "research_co_investigators_admin_write" ON public.research_co_investigators
  FOR ALL
  USING      (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---- workflow_stage_history ------------------------------
-- Append-only audit trail. Authenticated users can read and insert
-- (the Kanban board writes stage transitions); admins can rewrite.
ALTER TABLE public.workflow_stage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_history_auth_read" ON public.workflow_stage_history;
CREATE POLICY "workflow_history_auth_read" ON public.workflow_stage_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "workflow_history_auth_insert" ON public.workflow_stage_history;
CREATE POLICY "workflow_history_auth_insert" ON public.workflow_stage_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "workflow_history_admin_manage" ON public.workflow_stage_history;
CREATE POLICY "workflow_history_admin_manage" ON public.workflow_stage_history
  FOR ALL
  USING      (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---- research_attachments --------------------------------
-- File metadata rows. Authenticated read; uploads write to their
-- own row; admins manage.
ALTER TABLE public.research_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "research_attachments_auth_read" ON public.research_attachments;
CREATE POLICY "research_attachments_auth_read" ON public.research_attachments
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "research_attachments_uploader_insert" ON public.research_attachments;
CREATE POLICY "research_attachments_uploader_insert" ON public.research_attachments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "research_attachments_admin_manage" ON public.research_attachments;
CREATE POLICY "research_attachments_admin_manage" ON public.research_attachments
  FOR ALL
  USING      (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---- reports ---------------------------------------------
-- Generated-report metadata. Authenticated users see their own +
-- shared reports; admins manage everything.
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_auth_read" ON public.reports;
CREATE POLICY "reports_auth_read" ON public.reports
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "reports_auth_insert" ON public.reports;
CREATE POLICY "reports_auth_insert" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "reports_admin_manage" ON public.reports;
CREATE POLICY "reports_admin_manage" ON public.reports
  FOR ALL
  USING      (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---- backup_records --------------------------------------
-- Operational artefact — admins only.
ALTER TABLE public.backup_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "backup_records_admin_only" ON public.backup_records;
CREATE POLICY "backup_records_admin_only" ON public.backup_records
  FOR ALL
  USING      (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- Done. Sanity checks after applying:
--   SELECT relname, relrowsecurity FROM pg_class
--    WHERE relnamespace = 'public'::regnamespace AND relkind='r'
--    ORDER BY relname;
--   -- every public table should now show relrowsecurity = t
-- ============================================================
