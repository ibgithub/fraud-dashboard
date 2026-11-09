-- ============================================================
-- V21: Add "Menu Management" and "Setting Parameter Management"
--   menus under Setup (SET), right below Role Management
--   (SET-08, sort_order 5).
--   Menu Management       -> sort_order 6
--   Setting Parameter Mgmt -> sort_order 7
--   Shift existing SET-05/06/07 (sort_order >= 6) down by 2.
-- ============================================================

-- 1. Shift existing Setup sub-menus with sort_order >= 6 down by 2
UPDATE auth.menu SET sort_order = sort_order + 2
WHERE parent_code = 'SET' AND sort_order >= 6;

-- 2. Insert Menu Management (SET-09) and Setting Parameter Management (SET-10)
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(75, 'SET-09', 'SET', 'menu_set_09', '/setup/menu-management',    NULL, 6),
(76, 'SET-10', 'SET', 'menu_set_10', '/setup/setting-parameters', NULL, 7)
ON CONFLICT (id) DO NOTHING;

-- 3. Assign both to all existing roles
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, m.id, 'system'
FROM auth.roles r
CROSS JOIN (SELECT 75 AS id UNION ALL SELECT 76) m
WHERE NOT EXISTS (
    SELECT 1 FROM auth.role_menus rm
    WHERE rm.role_id = r.id AND rm.menu_id = m.id
);
