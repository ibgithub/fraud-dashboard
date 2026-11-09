-- ============================================================
-- V32: Add the "Customer Activity Matrix" sub-menu under CPI.
--
-- New menu row (code CPI-ACT) placed right after Customer Churn Matrix
-- (CPI-01). It is assigned to every role that currently has CPI-01, so
-- visibility matches the existing Customer Churn Matrix menu. Idempotent.
-- ============================================================

-- 1. Insert the menu row (explicit id, like other menu seeds). No-op if present.
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(90, 'CPI-ACT', 'CPI', 'menu_cpi_activity', '/cpi-matrix/activity', NULL, 2)
ON CONFLICT (id) DO NOTHING;

-- Keep the id sequence ahead of any explicit ids.
SELECT setval('auth.menu_id_seq', (SELECT COALESCE(MAX(id), 1) FROM auth.menu));

-- 2. Grant the new menu to every role that already has Customer Churn Matrix
--    (CPI-01), mirroring its visibility. Avoid duplicates.
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT rm.role_id, act.id, 'system'
FROM auth.role_menus rm
JOIN auth.menu churn ON churn.id = rm.menu_id AND churn.code = 'CPI-01'
JOIN auth.menu act   ON act.code = 'CPI-ACT'
WHERE NOT EXISTS (
    SELECT 1 FROM auth.role_menus x
    WHERE x.role_id = rm.role_id AND x.menu_id = act.id
);
