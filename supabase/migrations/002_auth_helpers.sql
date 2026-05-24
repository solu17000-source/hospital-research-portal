-- ============================================================
-- 002_auth_helpers.sql
--
-- Helpers, triggers and RLS policies that make Supabase Auth work
-- end-to-end with the portal's sign-in flow. Apply AFTER schema.sql.
--
-- What this fixes:
--   1. Anonymous clients can resolve a username to its email so they
--      can call auth.signInWithPassword (otherwise blocked by RLS).
--   2. Adding a user via Supabase Dashboard → Auth → Users auto-creates
--      a matching `profiles` row (no more manual INSERT step).
--   3. Backfills profiles for any auth.users rows added before this
--      migration was applied.
--   4. Authenticated users can read / update their own profile and
--      admins can read / write every profile.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Admin check (SECURITY DEFINER avoids RLS recursion when used
--    in policies that themselves apply to the profiles table).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND role IN ('super_admin', 'admin')
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;

-- ------------------------------------------------------------
-- 2. Username → email lookup.
--    Called by the auth-store BEFORE sign-in so an anon client can
--    translate the username typed by the user into the email that
--    supabase.auth.signInWithPassword expects.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lookup_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT email
  FROM public.profiles
  WHERE username = p_username
    AND is_active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_email_by_username(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_email_by_username(TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- 3. Auto-create a profile row when a new auth.users row appears.
--    Username falls back to local-part of the email; collisions get
--    a numeric suffix (mirrors the spec's Option-A rule).
--    Role / full name can be passed via raw_user_meta_data when the
--    admin creates the user, e.g. via the supabase-js admin API.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  n INT := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  );
  final_username := base_username;

  -- Unique-username enforcement — spec's Option-A auto-suffix on collision.
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    n := n + 1;
    final_username := base_username || n::text;
  END LOOP;

  INSERT INTO public.profiles (
    id, username, full_name, email, role,
    is_active, email_verified, login_count
  )
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', base_username),
    NEW.email,
    -- Default role from raw_user_meta_data.role, else authorized_staff.
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role,
      'authorized_staff'::user_role
    ),
    true,
    NEW.email_confirmed_at IS NOT NULL,
    0   -- forces a password change on first sign-in
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 4. Backfill — give every existing auth.users row a profile if it
--    doesn't have one. Safe to re-run.
-- ------------------------------------------------------------
INSERT INTO public.profiles (
  id, username, full_name, email, role, is_active, email_verified, login_count
)
SELECT
  u.id,
  SPLIT_PART(u.email, '@', 1) AS username,
  SPLIT_PART(u.email, '@', 1) AS full_name,
  u.email,
  'authorized_staff'::user_role,
  true,
  u.email_confirmed_at IS NOT NULL,
  0
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 5. RLS policies for `profiles`. We drop-then-create so the file
--    can be applied repeatedly without erroring.
-- ------------------------------------------------------------

-- Self-read
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
CREATE POLICY "profiles_self_read"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Self-update
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Admin reads every profile (uses is_admin() to avoid RLS recursion)
DROP POLICY IF EXISTS "profiles_admin_read" ON public.profiles;
CREATE POLICY "profiles_admin_read"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admin updates any profile
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Admin can insert new profiles directly (for the in-app User Management page)
DROP POLICY IF EXISTS "profiles_admin_insert" ON public.profiles;
CREATE POLICY "profiles_admin_insert"
  ON public.profiles
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- ------------------------------------------------------------
-- 6. Research projects — make sure created_by is auto-stamped to
--    the inserting user. The client passes it explicitly but if it's
--    null we fall back to auth.uid(). Same for updated_by on UPDATE.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stamp_research_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
    IF NEW.updated_by IS NULL THEN NEW.updated_by := auth.uid(); END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by := COALESCE(NEW.updated_by, auth.uid());
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stamp_research_audit_trigger ON public.research_projects;
CREATE TRIGGER stamp_research_audit_trigger
  BEFORE INSERT OR UPDATE ON public.research_projects
  FOR EACH ROW EXECUTE FUNCTION public.stamp_research_audit();

-- ------------------------------------------------------------
-- Done. Verify with:
--   SELECT public.lookup_email_by_username('sultan.alallah');
--   SELECT public.is_admin('YOUR-UUID');
--   SELECT count(*) FROM public.profiles;
-- ------------------------------------------------------------
