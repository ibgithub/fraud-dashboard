-- ============================================================
-- V4: Corporate Insight has no sub-menu, it's a direct page
-- Remove CI-01 sub-menu, update CI path to direct link
-- ============================================================

-- Remove CI-01 from role_menus first
DELETE FROM auth.role_menus WHERE menu_id = (SELECT id FROM auth.menu WHERE code = 'CI-01');

-- Remove CI-01 menu entry
DELETE FROM auth.menu WHERE code = 'CI-01';

-- Update CI path to be direct (no need for /overview sub-path)
UPDATE auth.menu SET path = '/corporate-insight' WHERE code = 'CI';
