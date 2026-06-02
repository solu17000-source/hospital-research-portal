-- ============================================================
-- 007_backfill_created_by.sql
--
-- Every research_project inserted before the auth-store wired up the
-- session correctly was written with created_by = NULL. That made
-- those rows un-deletable from the client because the DELETE policy
-- is `created_by = auth.uid() OR is_admin(auth.uid())` — a NULL
-- created_by can't match the first branch, so only admins could
-- delete them, and even then via the explicit admin branch.
--
-- Backfill the orphan rows to the spec's Super Admin (Sultan Alallah,
-- the bootstrap account). After this, every existing row has a real
-- owner and the standard creator-or-admin DELETE policy works for
-- everyone signed in as Sultan.
--
-- The UPDATE is guarded by `created_by IS NULL` so it can be re-run
-- safely; it touches nothing once every row has an owner.
-- ============================================================

UPDATE public.research_projects p
   SET created_by = (SELECT id FROM public.profiles
                      WHERE username = 'sultan.alallah'
                      LIMIT 1),
       updated_by = (SELECT id FROM public.profiles
                      WHERE username = 'sultan.alallah'
                      LIMIT 1),
       updated_at = NOW()
 WHERE p.created_by IS NULL;

-- Sanity check after applying:
--   SELECT count(*) FROM public.research_projects WHERE created_by IS NULL;
--   -- should return 0
