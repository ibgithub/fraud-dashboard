-- ============================================================
-- V16: Add "Deep-Dive HOT TARGET (Classic)" menu under CPI Matrix.
--   Placed right below CPI-02 (Deep-Dive HOT TARGET), sort_order 3.
--   Points to /cpi-matrix/hot-target-classic (pre-redesign version).
-- ============================================================

-- 1. Insert the new menu item
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(66, 'CPI-03', 'CPI', 'menu_cpi_03', '/cpi-matrix/hot-target-classic', NULL, 3)
ON CONFLICT (id) DO NOTHING;

-- 2. Assign the new menu to all existing roles
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, 66, 'system'
FROM auth.roles r
WHERE NOT EXISTS (
    SELECT 1 FROM auth.role_menus rm
    WHERE rm.role_id = r.id AND rm.menu_id = 66
);
