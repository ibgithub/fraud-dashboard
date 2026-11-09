-- ============================================================
-- V19: Remove the "Hot Target Per Nasabah" (classic) menu.
--   Menu id 66 = CPI-03 (/cpi-matrix/hot-target-classic).
-- ============================================================

-- 1. Remove role assignments for the classic menu
DELETE FROM auth.role_menus WHERE menu_id = 66;

-- 2. Remove the menu itself
DELETE FROM auth.menu WHERE id = 66 AND code = 'CPI-03';
