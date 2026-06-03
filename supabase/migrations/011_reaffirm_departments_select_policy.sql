-- 011_reaffirm_departments_select_policy.sql
--
-- Defensive: drop and recreate the SELECT policy on departments so we are
-- 100% sure it is in the state the dropdown expects — open to every role,
-- with no extra qualifier. This is idempotent.

DROP POLICY IF EXISTS departments_public_read ON public.departments;

CREATE POLICY departments_public_read ON public.departments
  FOR SELECT
  USING (true);

-- Make sure RLS is enabled (it already is, but explicit beats implicit).
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
