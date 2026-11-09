-- ============================================================
-- V3: Replace menus with CPI Analytics Tahap-01 structure
-- Based on CPI_WebApp_Tahap-01_Spec.md
-- ============================================================

-- 1. Clear existing role-menu assignments and menus
DELETE FROM auth.role_menus;
DELETE FROM auth.menu;

-- 2. Update Roles to match CPI spec (Pusat vs Cabang)
UPDATE auth.roles SET role_name = 'ADMIN', description = 'Administrator Pusat - akses penuh ke semua menu & fitur' WHERE id = 1;
UPDATE auth.roles SET role_name = 'PUSAT', description = 'Role Pusat (HQ/Direksi) - semua cabang, create/edit strategi' WHERE id = 2;
UPDATE auth.roles SET role_name = 'CABANG', description = 'Role Cabang (Kepala Cabang/RM) - hanya cabang sendiri, read-only strategi' WHERE id = 3;
DELETE FROM auth.roles WHERE id = 4;

-- 3. Insert new menus sesuai CPI Tahap-01 Spec
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
-- Menu utama (parent)
( 1, 'CI',    NULL, 'menu_ci',    '/corporate-insight',  'LayoutDashboard', 1),
( 2, 'CH',    NULL, 'menu_ch',    '/churn',              'TrendingDown',    2),
( 3, 'CP',    NULL, 'menu_cp',    '/profitability',      'DollarSign',      3),
( 4, 'CS',    NULL, 'menu_cs',    '/segmentation',       'Users',           4),
( 5, 'CPI',   NULL, 'menu_cpi',   '/cpi-matrix',         'Grid3x3',         5),
( 6, 'RS',    NULL, 'menu_rs',    '/recommender',        'ShoppingBag',     6),
( 7, 'CAM',   NULL, 'menu_cam',   '/campaign',           'Target',          7),
( 8, 'C360',  NULL, 'menu_c360',  '/customer-360',       'UserCircle',      8),
( 9, 'NOT',   NULL, 'menu_not',   '/alerts',             'Bell',            9),
(10, 'SET',   NULL, 'menu_set',   '/setup',              'Settings',       10),
(11, 'SYS',   NULL, 'menu_sys',   '/system',             'HelpCircle',     11),

-- 1. Corporate Insight
(12, 'CI-01', 'CI', 'menu_ci_01', '/corporate-insight/overview', NULL, 1),

-- 2. Churn Analysis
(13, 'CH-01', 'CH', 'menu_ch_01', '/churn/overview',          NULL, 1),
(14, 'CH-02', 'CH', 'menu_ch_02', '/churn/ranking',           NULL, 2),
(15, 'CH-03', 'CH', 'menu_ch_03', '/churn/model-performance', NULL, 3),

-- 3. Customer Profitability Analysis
(16, 'CP-01', 'CP', 'menu_cp_01', '/profitability/overview',          NULL, 1),
(17, 'CP-02', 'CP', 'menu_cp_02', '/profitability/list',              NULL, 2),
(18, 'CP-03', 'CP', 'menu_cp_03', '/profitability/model-performance', NULL, 3),

-- 4. Customer Segmentation Analysis
(19, 'CS-01', 'CS', 'menu_cs_01', '/segmentation/overview',          NULL, 1),
(20, 'CS-02', 'CS', 'menu_cs_02', '/segmentation/characteristics',   NULL, 2),
(21, 'CS-03', 'CS', 'menu_cs_03', '/segmentation/product-usage',     NULL, 3),
(22, 'CS-04', 'CS', 'menu_cs_04', '/segmentation/model-performance', NULL, 4),

-- 5. CPI Matrix
(23, 'CPI-01', 'CPI', 'menu_cpi_01', '/cpi-matrix/overview',  NULL, 1),
(24, 'CPI-02', 'CPI', 'menu_cpi_02', '/cpi-matrix/hot-target', NULL, 2),

-- 6. Recommender System
(25, 'RS-01', 'RS', 'menu_rs_01', '/recommender/recommendations',   NULL, 1),
(26, 'RS-02', 'RS', 'menu_rs_02', '/recommender/model-performance', NULL, 2),

-- 7. Campaign & Strategy Tracking
(27, 'CAM-01', 'CAM', 'menu_cam_01', '/campaign/registry',      NULL, 1),
(28, 'CAM-02', 'CAM', 'menu_cam_02', '/campaign/assignment',    NULL, 2),
(29, 'CAM-03', 'CAM', 'menu_cam_03', '/campaign/effectiveness', NULL, 3),

-- 8. Customer 360
(30, 'C360-01', 'C360', 'menu_c360_01', '/customer-360/profile', NULL, 1),

-- 9. Alert / Notification Center
(31, 'NOT-01', 'NOT', 'menu_not_01', '/alerts/center', NULL, 1),

-- 10. Setup
(32, 'SET-01', 'SET', 'menu_set_01', '/setup/threshold-churn',         NULL, 1),
(33, 'SET-02', 'SET', 'menu_set_02', '/setup/threshold-profitability',  NULL, 2),
(34, 'SET-03', 'SET', 'menu_set_03', '/setup/recommendation-settings',  NULL, 3),
(35, 'SET-04', 'SET', 'menu_set_04', '/setup/user-role-management',     NULL, 4),
(36, 'SET-05', 'SET', 'menu_set_05', '/setup/observation-settings',     NULL, 5),
(37, 'SET-06', 'SET', 'menu_set_06', '/setup/notification-rules',       NULL, 6),
(38, 'SET-07', 'SET', 'menu_set_07', '/setup/persona-labels',           NULL, 7),

-- 11. System
(39, 'SYS-01', 'SYS', 'menu_sys_01', '/system/profile',       NULL, 1),
(40, 'SYS-02', 'SYS', 'menu_sys_02', '/system/help-glossary', NULL, 2);

-- Sinkronkan sequence
SELECT setval('auth.menu_id_seq', (SELECT COALESCE(MAX(id), 1) FROM auth.menu));

-- 4. Assign menus ke roles

-- ADMIN (role_id = 1): Semua menu
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT 1, m.id, 'system' FROM auth.menu m;

-- PUSAT (role_id = 2): Semua menu kecuali SET-04 (User & Role Mgmt tetap admin-only)
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT 2, m.id, 'system' FROM auth.menu m
WHERE m.code != 'SET-04';

-- CABANG (role_id = 3): Analitik + Campaign (read assignment) + Customer360 + Alert + System
-- Tidak dapat: SET-01..07 (kecuali profile & help), CAM-01 (read-only via UI, tapi tetap tampil)
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT 3, m.id, 'system' FROM auth.menu m
WHERE m.code IN (
  -- Parent menus yang bisa diakses
  'CI', 'CH', 'CP', 'CS', 'CPI', 'RS', 'CAM', 'C360', 'NOT', 'SYS',
  -- Sub-menus analitik (semua)
  'CI-01',
  'CH-01', 'CH-02', 'CH-03',
  'CP-01', 'CP-02', 'CP-03',
  'CS-01', 'CS-02', 'CS-03', 'CS-04',
  'CPI-01', 'CPI-02',
  'RS-01', 'RS-02',
  -- Campaign (bisa lihat semua, tapi create strategi dikontrol di UI)
  'CAM-01', 'CAM-02', 'CAM-03',
  -- Customer 360
  'C360-01',
  -- Alert
  'NOT-01',
  -- System (profile & help)
  'SYS-01', 'SYS-02'
);
