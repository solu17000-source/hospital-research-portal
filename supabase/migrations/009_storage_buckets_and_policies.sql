-- 009_storage_buckets_and_policies.sql
--
-- Buckets:
--   research-files (private, 50 MB cap) — already exists, harden caps
--   avatars        (public,  50 MB cap)
--   reports        (private, 50 MB cap)
--   attachments    (private, 50 MB cap)
--
-- storage.objects RLS (per spec):
--   super_admin: upload + delete + download + update (everything)
--   admin:       upload + download (no delete, no update)
--   others:      download only
--
-- The bucket `avatars.public = true` lets anonymous viewers fetch avatar
-- URLs without auth, while uploads still require admin role.

-- ---------- buckets ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('avatars',     'avatars',     true,  52428800),
  ('reports',     'reports',     false, 52428800),
  ('attachments', 'attachments', false, 52428800)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;

UPDATE storage.buckets
   SET file_size_limit = 52428800,
       public = false
 WHERE id = 'research-files';

-- ---------- storage.objects policies ----------
-- Drop any prior PMNH-prefixed policies, then rebuild.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
     WHERE polrelid = 'storage.objects'::regclass
       AND polname LIKE 'pmnh_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END $$;

-- SELECT — any authenticated user can download from any pmnh bucket.
-- (The avatars bucket also has `public = true` so anonymous reads work
-- automatically for avatar URLs without going through this policy.)
CREATE POLICY pmnh_objects_authenticated_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('research-files','avatars','reports','attachments'));

-- INSERT — super_admin OR admin can upload.
CREATE POLICY pmnh_objects_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('research-files','avatars','reports','attachments')
    AND public.is_admin(auth.uid())
  );

-- UPDATE — super_admin only.
CREATE POLICY pmnh_objects_super_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('research-files','avatars','reports','attachments')
    AND public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    bucket_id IN ('research-files','avatars','reports','attachments')
    AND public.is_super_admin(auth.uid())
  );

-- DELETE — super_admin only.
CREATE POLICY pmnh_objects_super_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('research-files','avatars','reports','attachments')
    AND public.is_super_admin(auth.uid())
  );
