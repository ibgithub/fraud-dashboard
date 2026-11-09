-- ============================================================
-- V23: Add "Change Password" menu under System (SYS), right below
--   User Profile (SYS-01, sort_order 1). Change Password takes
--   sort_order 2; shift SYS-02 (Help & Glossary) down to 3.
-- ============================================================

-- 1. Shift existing System sub-menus with sort_order >= 2 down by 1
UPDATE auth.menu SET sort_order = sort_order + 1
WHERE parent_code = 'SYS' AND sort_order >= 2;

-- 2. Insert Change Password menu at sort_order 2
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(77, 'SYS-03', 'SYS', 'menu_sys_03', '/system/change-password', NULL, 2)
ON CONFLICT (id) DO NOTHING;

-- 3. Assign to all existing roles
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, 77, 'system'
FROM auth.roles r
WHERE NOT EXISTS (
    SELECT 1 FROM auth.role_menus rm
    WHERE rm.role_id = r.id AND rm.menu_id = 77
);
