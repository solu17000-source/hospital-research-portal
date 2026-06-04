-- 012_force_pgrst_schema_reload.sql
--
-- Re-runs the user's exact policy reset (idempotent) and — critically —
-- fires the LISTEN/NOTIFY channels that tell PostgREST to throw away
-- its in-memory schema + config snapshot.
--
-- After a large DELETE + INSERT cycle on a small table (migration 010
-- emptied departments then inserted 19 fresh rows in one transaction),
-- PostgREST occasionally serves a stale empty result-set from cache
-- before its background introspector catches up. Forcing a reload here
-- collapses that window: the next SELECT a browser issues sees the
-- 19 new rows immediately.

DROP POLICY IF EXISTS "departments_public_read" ON public.departments;

CREATE POLICY "departments_public_read" ON public.departments
  FOR SELECT
  USING (true);

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
