-- ============================================================
-- V9: Add Campaign Action Plan Template menu and reorder Campaign submenus
-- ============================================================

-- 1. Update existing campaign submenu sort_order to make room for new menu
UPDATE auth.menu SET sort_order = 2 WHERE code = 'CAM-02'; -- Assignment: 1 → 2
UPDATE auth.menu SET sort_order = 3 WHERE code = 'CAM-03'; -- Effectiveness: 2 → 3  
UPDATE auth.menu SET sort_order = 4 WHERE code = 'CAM-01'; -- Registry: 3 → 4 (move to last)

-- 2. Insert new Action Plan Template menu as first submenu
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(60, 'CAM-00', 'CAM', 'menu_cam_00', '/campaign/action-plan-template', NULL, 1)
ON CONFLICT (id) DO NOTHING;

-- 3. Assign new menu to all existing roles
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, 60, 'system'
FROM auth.roles r
WHERE NOT EXISTS (
    SELECT 1 FROM auth.role_menus rm 
    WHERE rm.role_id = r.id AND rm.menu_id = 60
);
