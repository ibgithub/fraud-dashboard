-- ============================================================
-- V17: Add "AUM Analysis" parent menu right below "Churn Analysis".
--   Churn (CH) has sort_order 4. AUM will take sort_order 5, and all
--   existing top-level menus at sort_order >= 5 are shifted down by 1.
--   Sub-menus: AUM Overview (/aum/overview), AUM Ranking (/aum/ranking).
-- ============================================================

-- 1. Shift existing top-level menus (parent_code IS NULL) with sort_order >= 5 down by 1
UPDATE auth.menu
SET sort_order = sort_order + 1
WHERE parent_code IS NULL AND sort_order >= 5;

-- 2. Insert AUM parent menu (sort_order 5, right after Churn=4)
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(70, 'AUM', NULL, 'menu_aum', '/aum', NULL, 5)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert AUM sub-menus
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(71, 'AUM-01', 'AUM', 'menu_aum_01', '/aum/overview', NULL, 1),
(72, 'AUM-02', 'AUM', 'menu_aum_02', '/aum/ranking', NULL, 2)
ON CONFLICT (id) DO NOTHING;

-- 4. Assign the new menus to all existing roles
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, m.id, 'system'
FROM auth.roles r
CROSS JOIN (VALUES (70), (71), (72)) AS m(id)
WHERE NOT EXISTS (
    SELECT 1 FROM auth.role_menus rm
    WHERE rm.role_id = r.id AND rm.menu_id = m.id
);
