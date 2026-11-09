-- ============================================================
-- V15: Add Recommendation History menu under Campaign & Strategy
-- ============================================================

-- 1. Insert Recommendation History menu
-- Placing it after "Aksi Per Kelompok Matriks" in the Campaign submenu
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(65, 'CAM-HIST', 'CAM', 'menu_cam_history', '/campaign/recommendation-history', NULL, 5)
ON CONFLICT (id) DO NOTHING;

-- 2. Assign new menu to all existing roles
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, 65, 'system'
FROM auth.roles r
WHERE NOT EXISTS (
    SELECT 1 FROM auth.role_menus rm 
    WHERE rm.role_id = r.id AND rm.menu_id = 65
);

-- Notes:
-- - Menu ID 65 is used to avoid conflicts with existing menu IDs
-- - sort_order 5 places it as the 5th submenu under Campaign & Strategy
-- - All existing roles will automatically get access to this new menu
