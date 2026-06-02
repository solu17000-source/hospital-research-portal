-- 008_role_based_permissions.sql
--
-- Tighten role-based access control:
--   - super_admin: full CRUD on every table + user management + role assignment
--   - admin: SELECT / INSERT / UPDATE only — cannot DELETE, cannot manage profiles
--   - other authenticated users: per-row rules (own profile / own notifications)
--
-- The previous `is_admin(uid)` helper returns true for BOTH admin and
-- super_admin. DELETE policies that used `is_admin` therefore allowed both
-- roles to delete. This migration introduces `is_super_admin(uid)` and
-- rewrites every DELETE policy + the profile management policies to use it
-- exclusively, so the spec's "admin can't delete, only super_admin can" is
-- enforced at the database layer (not just hidden in the UI).

-- ---------- helper ----------
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = user_id AND role = 'super_admin'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;

-- ---------- research_projects ----------
DROP POLICY IF EXISTS research_delete_creator_or_admin     ON public.research_projects;
DROP POLICY IF EXISTS research_delete_super_admin_only     ON public.research_projects;
CREATE POLICY research_delete_super_admin_only ON public.research_projects
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ---------- profiles ----------
DROP POLICY IF EXISTS profiles_admin_insert          ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_update          ON public.profiles;
DROP POLICY IF EXISTS profiles_update                ON public.profiles;
DROP POLICY IF EXISTS profiles_delete                ON public.profiles;
DROP POLICY IF EXISTS profiles_super_admin_insert    ON public.profiles;
DROP POLICY IF EXISTS profiles_super_admin_update    ON public.profiles;
DROP POLICY IF EXISTS profiles_super_admin_delete    ON public.profiles;

CREATE POLICY profiles_super_admin_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY profiles_super_admin_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY profiles_super_admin_delete ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ---------- departments ----------
DROP POLICY IF EXISTS departments_admin_write        ON public.departments;
DROP POLICY IF EXISTS departments_admin_insert       ON public.departments;
DROP POLICY IF EXISTS departments_admin_update       ON public.departments;
DROP POLICY IF EXISTS departments_super_admin_delete ON public.departments;
CREATE POLICY departments_admin_insert ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY departments_admin_update ON public.departments
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY departments_super_admin_delete ON public.departments
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ---------- notifications ----------
DROP POLICY IF EXISTS notif_admin_manage              ON public.notifications;
DROP POLICY IF EXISTS notif_admin_insert              ON public.notifications;
DROP POLICY IF EXISTS notif_admin_update              ON public.notifications;
DROP POLICY IF EXISTS notif_super_admin_delete_any    ON public.notifications;
CREATE POLICY notif_admin_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY notif_admin_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY notif_super_admin_delete_any ON public.notifications
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ---------- reports ----------
DROP POLICY IF EXISTS reports_admin_manage           ON public.reports;
DROP POLICY IF EXISTS reports_admin_update           ON public.reports;
DROP POLICY IF EXISTS reports_super_admin_delete     ON public.reports;
CREATE POLICY reports_admin_update ON public.reports
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY reports_super_admin_delete ON public.reports
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ---------- research_attachments ----------
DROP POLICY IF EXISTS research_attachments_admin_manage       ON public.research_attachments;
DROP POLICY IF EXISTS research_attachments_admin_update       ON public.research_attachments;
DROP POLICY IF EXISTS research_attachments_super_admin_delete ON public.research_attachments;
CREATE POLICY research_attachments_admin_update ON public.research_attachments
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY research_attachments_super_admin_delete ON public.research_attachments
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ---------- research_co_investigators ----------
DROP POLICY IF EXISTS research_co_investigators_admin_write       ON public.research_co_investigators;
DROP POLICY IF EXISTS research_co_investigators_admin_insert      ON public.research_co_investigators;
DROP POLICY IF EXISTS research_co_investigators_admin_update      ON public.research_co_investigators;
DROP POLICY IF EXISTS research_co_investigators_super_admin_delete ON public.research_co_investigators;
CREATE POLICY research_co_investigators_admin_insert ON public.research_co_investigators
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY research_co_investigators_admin_update ON public.research_co_investigators
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY research_co_investigators_super_admin_delete ON public.research_co_investigators
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ---------- qr_codes ----------
DROP POLICY IF EXISTS qr_codes_creator_or_admin_write    ON public.qr_codes;
DROP POLICY IF EXISTS qr_codes_admin_insert              ON public.qr_codes;
DROP POLICY IF EXISTS qr_codes_admin_update              ON public.qr_codes;
DROP POLICY IF EXISTS qr_codes_super_admin_delete        ON public.qr_codes;
CREATE POLICY qr_codes_admin_insert ON public.qr_codes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY qr_codes_admin_update ON public.qr_codes
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR (created_by = auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR (created_by = auth.uid()));
CREATE POLICY qr_codes_super_admin_delete ON public.qr_codes
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ---------- system_settings ----------
DROP POLICY IF EXISTS system_settings_admin_write        ON public.system_settings;
DROP POLICY IF EXISTS system_settings_admin_insert       ON public.system_settings;
DROP POLICY IF EXISTS system_settings_admin_update       ON public.system_settings;
DROP POLICY IF EXISTS system_settings_super_admin_delete ON public.system_settings;
CREATE POLICY system_settings_admin_insert ON public.system_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY system_settings_admin_update ON public.system_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY system_settings_super_admin_delete ON public.system_settings
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ---------- workflow_stage_history ----------
DROP POLICY IF EXISTS workflow_history_admin_manage       ON public.workflow_stage_history;
DROP POLICY IF EXISTS workflow_history_admin_update       ON public.workflow_stage_history;
DROP POLICY IF EXISTS workflow_history_super_admin_delete ON public.workflow_stage_history;
CREATE POLICY workflow_history_admin_update ON public.workflow_stage_history
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY workflow_history_super_admin_delete ON public.workflow_stage_history
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));
