-- ============================================================
-- V18: Add "Proses Promo Engine" menu under CPI Matrix, right below
--   Deep-Dive HOT TARGET (CPI-02, sort_order 2).
--   Promo Engine takes sort_order 3; shift CPI-03 (classic) to 4.
-- ============================================================

-- 1. Push CPI-03 (hot-target-classic) down to sort_order 4
UPDATE auth.menu SET sort_order = 4 WHERE code = 'CPI-03' AND parent_code = 'CPI';

-- 2. Insert Promo Engine menu at sort_order 3
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(73, 'CPI-05', 'CPI', 'menu_cpi_05', '/cpi-matrix/promo-engine', NULL, 3)
ON CONFLICT (id) DO NOTHING;

-- 3. Assign to all existing roles
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, 73, 'system'
FROM auth.roles r
WHERE NOT EXISTS (
    SELECT 1 FROM auth.role_menus rm
    WHERE rm.role_id = r.id AND rm.menu_id = 73
);
