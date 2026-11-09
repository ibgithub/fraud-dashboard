-- ============================================================
-- V7: Restore CPI Matrix (CPI), Kampanye & Strategi (CAM),
-- Customer 360 (C360), and Pusat Notifikasi (NOT) menus
-- ============================================================

INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
( 5, 'CPI',     NULL,   'menu_cpi',     '/cpi-matrix',           'Grid3x3',    5),
( 7, 'CAM',     NULL,   'menu_cam',     '/campaign',             'Target',     7),
( 8, 'C360',    NULL,   'menu_c360',    '/customer-360',         'UserCircle', 8),
( 9, 'NOT',     NULL,   'menu_not',     '/alerts',               'Bell',       9),
(23, 'CPI-01',  'CPI',  'menu_cpi_01',  '/cpi-matrix/overview',  NULL,         1),
(24, 'CPI-02',  'CPI',  'menu_cpi_02',  '/cpi-matrix/hot-target', NULL,        2),
(27, 'CAM-01',  'CAM',  'menu_cam_01',  '/campaign/registry',    NULL,         1),
(28, 'CAM-02',  'CAM',  'menu_cam_02',  '/campaign/assignment',  NULL,         2),
(29, 'CAM-03',  'CAM',  'menu_cam_03',  '/campaign/effectiveness', NULL,     3),
(30, 'C360-01', 'C360', 'menu_c360_01', '/customer-360/profile',   NULL,         1),
(31, 'NOT-01',  'NOT',  'menu_not_01',  '/alerts/center',        NULL,         1)
ON CONFLICT (id) DO UPDATE SET 
    code = EXCLUDED.code,
    parent_code = EXCLUDED.parent_code,
    menu_key = EXCLUDED.menu_key,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- Assign restored menus to all roles (ADMIN, PUSAT, CABANG)
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, m.id, 'system'
FROM auth.roles r
CROSS JOIN auth.menu m
WHERE m.id IN (5, 7, 8, 9, 23, 24, 27, 28, 29, 30, 31)
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- Synchronize menu id sequence
SELECT setval('auth.menu_id_seq', (SELECT COALESCE(MAX(id), 1) FROM auth.menu));
