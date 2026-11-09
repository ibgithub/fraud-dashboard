-- ============================================================
-- V33: Remove the "Customer Activity Matrix" sub-menu (CPI-ACT).
--
-- Reverses V32. The Activity matrix will be merged into the existing
-- Customer Churn Matrix page (/cpi-matrix/overview) instead of being a
-- separate menu. Deletes the role assignments first, then the menu row.
-- Idempotent.
-- ============================================================

DELETE FROM auth.role_menus
WHERE menu_id IN (SELECT id FROM auth.menu WHERE code = 'CPI-ACT');

DELETE FROM auth.menu WHERE code = 'CPI-ACT';
