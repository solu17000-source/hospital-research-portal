-- 010_seed_departments_master_list.sql
--
-- Replace the existing departments rows with the operator-supplied
-- 19-item master list. Old rows whose names map cleanly to a new entry
-- (Emergency → Emergency Medicine; OB/GYN → Obstetrics & Gynecology) keep
-- their attached research projects; other obsolete departments
-- (Administration, Neurology, Orthopedics) are dropped and their research
-- rows are reset to department_id = NULL.
--
-- The `code` column is NOT NULL + UNIQUE, so every new row is given a
-- short uppercase code. `color` and `icon` keep the column defaults.
-- research_count is recomputed at the end from the actual link counts.

-- 1. Capture the old name for every research row that has a department.
CREATE TEMP TABLE _research_dept_backup AS
SELECT r.id AS research_id, d.name AS old_dept_name
  FROM public.research_projects r
  JOIN public.departments d ON d.id = r.department_id
 WHERE r.department_id IS NOT NULL;

-- 2. Detach every FK reference so we can delete cleanly. All three
-- referencing columns are nullable.
UPDATE public.research_projects SET department_id = NULL WHERE department_id IS NOT NULL;
UPDATE public.profiles          SET department_id = NULL WHERE department_id IS NOT NULL;
UPDATE public.reports           SET department_id = NULL WHERE department_id IS NOT NULL;

-- 3. Wipe the departments table.
DELETE FROM public.departments;

-- 4. Insert the spec's 19-item master list.
INSERT INTO public.departments (name, code, is_active) VALUES
  ('Internal Medicine',         'INT-MED',  true),
  ('Surgery',                   'SURG',     true),
  ('Emergency Medicine',        'EMRG',     true),
  ('Nursing',                   'NURS',     true),
  ('ICU',                       'ICU',      true),
  ('Pediatrics',                'PEDI',     true),
  ('Obstetrics & Gynecology',   'OBGYN',    true),
  ('Cardiology',                'CARD',     true),
  ('Radiology',                 'RADI',     true),
  ('Laboratory',                'LAB',      true),
  ('Pharmacy',                  'PHRM',     true),
  ('Physiotherapy',             'PHYS',     true),
  ('Infection Control',         'INFCTRL',  true),
  ('Research & Development',    'R-D',      true),
  ('Ophthalmology',             'OPHTH',    true),
  ('Hematology',                'HEMA',     true),
  ('Psychiatry',                'PSY',      true),
  ('Respiratory Therapy',       'RESP',     true),
  ('Quality & Patient Safety',  'QPS',      true);

-- 5. Restore research_projects.department_id by old-name matching where
-- the old name has a counterpart in the new list. Old names that no
-- longer exist (Administration / Neurology / Orthopedics) stay NULL.
UPDATE public.research_projects r
   SET department_id = d.id
  FROM _research_dept_backup b
  JOIN public.departments d
    ON (
      d.name = b.old_dept_name
      OR (b.old_dept_name = 'Emergency' AND d.name = 'Emergency Medicine')
      OR (b.old_dept_name = 'OB/GYN'    AND d.name = 'Obstetrics & Gynecology')
    )
 WHERE r.id = b.research_id;

-- 6. Recompute research_count for every department so the dashboard
-- ordering reflects reality after the reseed.
UPDATE public.departments d
   SET research_count = (
     SELECT COUNT(*) FROM public.research_projects p
      WHERE p.department_id = d.id
        AND p.is_archived = false
   );

DROP TABLE _research_dept_backup;
