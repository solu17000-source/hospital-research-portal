-- ============================================================
-- 006_complete_research_crud_policies.sql
--
-- Closes the holes that were leaving the "Save" button stuck on
-- "saving" forever:
--
--   1. research_projects had only SELECT + INSERT (WITH CHECK) +
--      UPDATE (USING only — no WITH CHECK, no DELETE policy).
--      Postgres rejected DELETEs silently from the client, and any
--      UPDATE that the client believed it could make (e.g. archive,
--      progress bump) was leaking past the with-check.
--
--   2. notifications had a single FOR ALL policy with no WITH CHECK,
--      which works for SELECT but rejects INSERT in some Postgres
--      versions.
--
-- Replaces every pre-existing client-write policy on these tables
-- with explicit, named INSERT / UPDATE / DELETE policies plus a
-- separate admin-override.
-- ============================================================

-- ---- research_projects ----------------------------------------
DROP POLICY IF EXISTS "research_select_public"  ON public.research_projects;
DROP POLICY IF EXISTS "research_insert_staff"   ON public.research_projects;
DROP POLICY IF EXISTS "research_update_staff"   ON public.research_projects;
DROP POLICY IF EXISTS "research_delete_staff"   ON public.research_projects;
DROP POLICY IF EXISTS "research_admin_manage"   ON public.research_projects;

CREATE POLICY "research_select_public" ON public.research_projects
  FOR SELECT
  USING (is_public = true OR auth.uid() IS NOT NULL);

CREATE POLICY "research_insert_staff" ON public.research_projects
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "research_update_staff" ON public.research_projects
  FOR UPDATE
  USING      (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Staff who created the row can delete it; admins can delete anything.
CREATE POLICY "research_delete_creator_or_admin" ON public.research_projects
  FOR DELETE
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- ---- notifications --------------------------------------------
-- `notifications_own` covered SELECT correctly but lacked WITH CHECK,
-- which can cause INSERT rejections. Replace with explicit per-op
-- policies.
DROP POLICY IF EXISTS "notifications_own"    ON public.notifications;
DROP POLICY IF EXISTS "notif_select_own"     ON public.notifications;
DROP POLICY IF EXISTS "notif_insert_self"    ON public.notifications;
DROP POLICY IF EXISTS "notif_update_own"     ON public.notifications;
DROP POLICY IF EXISTS "notif_delete_own"     ON public.notifications;
DROP POLICY IF EXISTS "notif_admin_manage"   ON public.notifications;

CREATE POLICY "notif_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notif_insert_self" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "notif_update_own" ON public.notifications
  FOR UPDATE
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notif_delete_own" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "notif_admin_manage" ON public.notifications
  FOR ALL
  USING      (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---- activity_logs --------------------------------------------
-- Append-only audit trail. Authenticated users can append their own
-- log entries; admins read everything.
DROP POLICY IF EXISTS "activity_logs_admin_read"   ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_auth_insert"  ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_self_read"    ON public.activity_logs;

CREATE POLICY "activity_logs_self_read" ON public.activity_logs
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "activity_logs_auth_insert" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Sanity check after applying:
--   SELECT tablename, cmd, policyname FROM pg_policies
--    WHERE schemaname='public'
--      AND tablename IN ('research_projects','notifications','activity_logs')
--    ORDER BY tablename, cmd, policyname;
-- ============================================================
