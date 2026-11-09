-- ============================================================
-- V24: Create a dedicated "Administration" (ADM) parent menu and
--   move the access/system management pages under it:
--     - User Management            (was SET-04)
--     - Role Management            (was SET-08)
--     - Menu Management            (was SET-09)
--     - Setting Parameter Mgmt     (was SET-10)
--   Setup (SET) keeps only the analytical/business config menus.
-- ============================================================

-- 1. Insert the new ADM parent menu (top-level). sort_order 10.5 so it
--    sits right after Setup (SET = 10) and before System (SYS = 11).
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(78, 'ADM', NULL, 'menu_adm', '/admin', 'ShieldCheck', 10.5)
ON CONFLICT (id) DO NOTHING;

-- 2. Re-parent the four management menus to ADM and renumber them 1..4.
UPDATE auth.menu SET parent_code = 'ADM', sort_order = 1 WHERE code = 'SET-04'; -- User Management
UPDATE auth.menu SET parent_code = 'ADM', sort_order = 2 WHERE code = 'SET-08'; -- Role Management
UPDATE auth.menu SET parent_code = 'ADM', sort_order = 3 WHERE code = 'SET-09'; -- Menu Management
UPDATE auth.menu SET parent_code = 'ADM', sort_order = 4 WHERE code = 'SET-10'; -- Setting Parameter Management

-- 3. Assign the ADM parent to all roles that can see at least one of its children,
--    so the group header renders for them.
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT DISTINCT rm.role_id, 78, 'system'
FROM auth.role_menus rm
JOIN auth.menu m ON m.id = rm.menu_id
WHERE m.code IN ('SET-04', 'SET-08', 'SET-09', 'SET-10')
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_menus x
      WHERE x.role_id = rm.role_id AND x.menu_id = 78
  );
