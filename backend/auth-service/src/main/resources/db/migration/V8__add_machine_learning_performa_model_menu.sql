-- ============================================================
-- V8: Add MACHINE LEARNING section & Performa Model (ML) parent menu
-- Consolidation of Model Performance for Churn, Segmentasi, & Rekomendasi
-- ============================================================

-- 1. Remove old model-performance submenus from CH, CS, RS if any
DELETE FROM auth.role_menus WHERE menu_id IN (15, 22, 26);
DELETE FROM auth.menu WHERE id IN (15, 22, 26);

-- 2. Insert new parent menu ML (Performa Model) and submenus
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(50, 'ML',    NULL, 'menu_ml',    '/model-performance',              'Cpu', 9.5),
(51, 'ML-01', 'ML', 'menu_ml_01', '/churn/model-performance',        NULL,  1),
(52, 'ML-02', 'ML', 'menu_ml_02', '/segmentation/model-performance', NULL,  2),
(53, 'ML-03', 'ML', 'menu_ml_03', '/recommender/model-performance',  NULL,  3)
ON CONFLICT (id) DO UPDATE SET 
    code = EXCLUDED.code,
    parent_code = EXCLUDED.parent_code,
    menu_key = EXCLUDED.menu_key,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- 3. Assign ML menu and submenus to all roles (ADMIN, PUSAT, CABANG)
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, m.id, 'system'
FROM auth.roles r
CROSS JOIN auth.menu m
WHERE m.id IN (50, 51, 52, 53)
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- 4. Synchronize sequence
SELECT setval('auth.menu_id_seq', (SELECT COALESCE(MAX(id), 1) FROM auth.menu));
