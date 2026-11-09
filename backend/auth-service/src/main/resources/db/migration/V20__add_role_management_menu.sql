-- ============================================================
-- V20: Add "Role Management" menu under Setup (SET), right below
--   User Management (SET-04, sort_order 4). Role Management takes
--   sort_order 5; shift SET-05/06/07 down by 1.
-- ============================================================

-- 1. Shift existing Setup sub-menus with sort_order >= 5 down by 1
UPDATE auth.menu SET sort_order = sort_order + 1
WHERE parent_code = 'SET' AND sort_order >= 5;

-- 2. Insert Role Management menu at sort_order 5
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(74, 'SET-08', 'SET', 'menu_set_08', '/setup/role-management', NULL, 5)
ON CONFLICT (id) DO NOTHING;

-- 3. Assign to all existing roles
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, 74, 'system'
FROM auth.roles r
WHERE NOT EXISTS (
    SELECT 1 FROM auth.role_menus rm
    WHERE rm.role_id = r.id AND rm.menu_id = 74
);
