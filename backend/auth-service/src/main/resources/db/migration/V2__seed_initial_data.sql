-- ============================================================
-- V2: Seed Data Awal (Menu, Role, User, Role-Menu, Parameters)
-- ============================================================

-- 1. Seed Roles
INSERT INTO auth.roles (id, role_name, description, created_by) VALUES
(1, 'ADMIN', 'Administrator - akses penuh ke semua menu', 'system'),
(2, 'TREASURY', 'Divisi Treasury', 'system'),
(3, 'MARKETING', 'Divisi Marketing', 'system'),
(4, 'LENDING', 'Divisi Lending/Kredit', 'system')
ON CONFLICT (id) DO NOTHING;

-- Sinkronkan sequence roles_id_seq
SELECT setval('auth.roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM auth.roles));

-- 2. Seed Users
-- Password default:
-- admin     -> admin123 ($2a$10$TnMxKsV6zYnP5PkY7QP9FepC2pr3Mvz/FsXXz5ztBe7HnEsC5ytCS)
-- treasury1 -> password123 ($2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy)
-- marketing1-> password123 ($2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy)
-- lending1  -> password123 ($2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy)
INSERT INTO auth.users (id, username, email, password, first_name, last_name, phone_number, app_lang, app_row_per_page, status, login_failed_count, created_by) VALUES
(1, 'admin', 'admin@cpi.local', '$2a$10$TnMxKsV6zYnP5PkY7QP9FepC2pr3Mvz/FsXXz5ztBe7HnEsC5ytCS', 'Administrator', 'CPI', '08123456789', 'id', 10, 1, 0, 'system'),
(2, 'treasury1', 'treasury1@bank.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Budi', 'Treasury', '08123456780', 'id', 10, 1, 0, 'system'),
(3, 'marketing1', 'marketing1@bank.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Sari', 'Marketing', '08123456781', 'id', 10, 1, 0, 'system'),
(4, 'lending1', 'lending1@bank.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Andi', 'Lending', '08123456782', 'id', 10, 1, 0, 'system')
ON CONFLICT (id) DO NOTHING;

-- Sinkronkan sequence users_id_seq
SELECT setval('auth.users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM auth.users));

-- 3. Assign Roles ke Users
INSERT INTO auth.user_roles (user_id, role_id, created_by) VALUES
(1, 1, 'system'), -- admin -> ADMIN
(2, 2, 'system'), -- treasury1 -> TREASURY
(3, 3, 'system'), -- marketing1 -> MARKETING
(4, 4, 'system')  -- lending1 -> LENDING
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 4. Seed Menus
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(1, 'M1', NULL, 'menu_m1', '/executive', 'LayoutDashboard', 1),
(2, 'M2', NULL, 'menu_m2', '/segmentation', 'Users', 2),
(3, 'M3', NULL, 'menu_m3', '/churn', 'TrendingDown', 3),
(4, 'M4', NULL, 'menu_m4', '/profitability', 'DollarSign', 4),
(5, 'M5', NULL, 'menu_m5', '/recommendation', 'ShoppingBag', 5),
(6, 'M6', NULL, 'menu_m6', '/customer-profile', 'UserCircle', 6),
(7, 'M7', NULL, 'menu_m7', '/reports', 'BarChart3', 7),
(8, 'M8', NULL, 'menu_m8', '/settings', 'Settings', 8),
(9, 'M1.1', 'M1', 'menu_m1_1', '/executive/portfolio', NULL, 1),
(10, 'M1.2', 'M1', 'menu_m1_2', '/executive/churn-distribution', NULL, 2),
(11, 'M1.3', 'M1', 'menu_m1_3', '/executive/segmentation-summary', NULL, 3),
(12, 'M1.4', 'M1', 'menu_m1_4', '/executive/top-products', NULL, 4),
(13, 'M1.5', 'M1', 'menu_m1_5', '/executive/priority-alerts', NULL, 5),
(14, 'M1.6', 'M1', 'menu_m1_6', '/executive/demographics', NULL, 6),
(15, 'M2.1', 'M2', 'menu_m2_1', '/segmentation/cluster-map', NULL, 1),
(16, 'M2.2', 'M2', 'menu_m2_2', '/segmentation/persona', NULL, 2),
(17, 'M2.3', 'M2', 'menu_m2_3', '/segmentation/characteristics', NULL, 3),
(18, 'M2.4', 'M2', 'menu_m2_4', '/segmentation/member-list', NULL, 4),
(19, 'M2.5', 'M2', 'menu_m2_5', '/segmentation/migration-trend', NULL, 5),
(20, 'M3.1', 'M3', 'menu_m3_1', '/churn/watchlist', NULL, 1),
(21, 'M3.2', 'M3', 'menu_m3_2', '/churn/score-distribution', NULL, 2),
(22, 'M3.3', 'M3', 'menu_m3_3', '/churn/worsening-score', NULL, 3),
(23, 'M3.4', 'M3', 'menu_m3_4', '/churn/driver-detail', NULL, 4),
(24, 'M3.5', 'M3', 'menu_m3_5', '/churn/action-history', NULL, 5),
(25, 'M4.1', 'M4', 'menu_m4_1', '/profitability/ranking', NULL, 1),
(26, 'M4.2', 'M4', 'menu_m4_2', '/profitability/priority-matrix', NULL, 2),
(27, 'M4.3', 'M4', 'menu_m4_3', '/profitability/persona-group', NULL, 3),
(28, 'M4.4', 'M4', 'menu_m4_4', '/profitability/breakdown', NULL, 4),
(29, 'M4.5', 'M4', 'menu_m4_5', '/profitability/trend', NULL, 5),
(30, 'M4.6', 'M4', 'menu_m4_6', '/profitability/clv', NULL, 6),
(31, 'M5.1', 'M5', 'menu_m5_1', '/recommendation/list', NULL, 1),
(32, 'M5.2', 'M5', 'menu_m5_2', '/recommendation/status', NULL, 2),
(33, 'M5.3', 'M5', 'menu_m5_3', '/recommendation/cold-start', NULL, 3),
(34, 'M5.4', 'M5', 'menu_m5_4', '/recommendation/performance', NULL, 4),
(35, 'M5.5', 'M5', 'menu_m5_5', '/recommendation/product-config', NULL, 5),
(36, 'M6.1', 'M6', 'menu_m6_1', '/customer-profile/overview', NULL, 1),
(37, 'M6.2', 'M6', 'menu_m6_2', '/customer-profile/cluster-persona', NULL, 2),
(38, 'M6.3', 'M6', 'menu_m6_3', '/customer-profile/churn-score', NULL, 3),
(39, 'M6.4', 'M6', 'menu_m6_4', '/customer-profile/profitability-clv', NULL, 4),
(40, 'M6.5', 'M6', 'menu_m6_5', '/customer-profile/retention-priority', NULL, 5),
(41, 'M6.6', 'M6', 'menu_m6_6', '/customer-profile/active-recommendations', NULL, 6),
(42, 'M6.7', 'M6', 'menu_m6_7', '/customer-profile/credit-score', NULL, 7),
(43, 'M6.8', 'M6', 'menu_m6_8', '/customer-profile/rm-interaction', NULL, 8),
(44, 'M7.1', 'M7', 'menu_m7_1', '/reports/segmentation', NULL, 1),
(45, 'M7.2', 'M7', 'menu_m7_2', '/reports/churn-retention', NULL, 2),
(46, 'M7.3', 'M7', 'menu_m7_3', '/reports/profitability', NULL, 3),
(47, 'M7.4', 'M7', 'menu_m7_4', '/reports/recommendation-effectiveness', NULL, 4),
(48, 'M7.5', 'M7', 'menu_m7_5', '/reports/export', NULL, 5),
(49, 'M8.1', 'M8', 'menu_m8_1', '/settings/model-parameters', NULL, 1),
(50, 'M8.2', 'M8', 'menu_m8_2', '/settings/batch-processing', NULL, 2),
(51, 'M8.3', 'M8', 'menu_m8_3', '/settings/product-config', NULL, 3),
(52, 'M8.4', 'M8', 'menu_m8_4', '/settings/user-management', NULL, 4),
(53, 'M8.5', 'M8', 'menu_m8_5', '/settings/role-management', NULL, 5),
(54, 'M8.6', 'M8', 'menu_m8_6', '/settings/menu-management', NULL, 6),
(55, 'M8.7', 'M8', 'menu_m8_7', '/settings/change-password', NULL, 7),
(56, 'M8.8', 'M8', 'menu_m8_8', '/settings/integration-monitoring', NULL, 8),
(57, 'M8.9', 'M8', 'menu_m8_9', '/settings/audit-log', NULL, 9),
(58, 'M8.10', 'M8', 'menu_m8_10', '/settings/edit-profile', NULL, 10),
(59, 'M8.11', 'M8', 'menu_m8_11', '/settings/system-parameters', NULL, 11)
ON CONFLICT (id) DO NOTHING;

-- Sinkronkan sequence menu_id_seq
SELECT setval('auth.menu_id_seq', (SELECT COALESCE(MAX(id), 1) FROM auth.menu));

-- 5. Assign Menus ke Roles (Role-Menus)

-- ADMIN (role_id = 1): Akses seluruh menu
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT 1, m.id, 'system'
FROM auth.menu m
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- TREASURY (role_id = 2): Executive, Profitability, Reports, Edit Profile, Change Password
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT 2, m.id, 'system'
FROM auth.menu m
WHERE m.code LIKE 'M1%' OR m.code LIKE 'M4%' OR m.code LIKE 'M7%' OR m.code IN ('M8', 'M8.7', 'M8.10')
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- MARKETING (role_id = 3): Executive, Segmentation, Recommendation, Reports, Edit Profile, Change Password
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT 3, m.id, 'system'
FROM auth.menu m
WHERE m.code LIKE 'M1%' OR m.code LIKE 'M2%' OR m.code LIKE 'M5%' OR m.code LIKE 'M7%' OR m.code IN ('M8', 'M8.7', 'M8.10')
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- LENDING (role_id = 4): Executive, Churn, Customer Profile, Reports, Edit Profile, Change Password
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT 4, m.id, 'system'
FROM auth.menu m
WHERE m.code LIKE 'M1%' OR m.code LIKE 'M3%' OR m.code LIKE 'M6%' OR m.code LIKE 'M7%' OR m.code IN ('M8', 'M8.7', 'M8.10')
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- 6. Seed Setting Parameters
INSERT INTO auth.setting_parameters (name, value, description, created_by) VALUES
('MAX_WRONG_PASSWORD', '5', 'Maksimal percobaan login gagal sebelum akun terkunci', 'system'),
('SESSION_TIMEOUT_MINUTES', '60', 'Timeout sesi user (menit)', 'system'),
('PASSWORD_EXPIRY_DAYS', '90', 'Masa berlaku password (hari)', 'system'),
('PASSWORD_MIN_LENGTH', '8', 'Panjang minimal password', 'system'),
('JWT_EXPIRATION_HOURS', '1', 'Masa berlaku JWT token (jam)', 'system')
ON CONFLICT (name) DO NOTHING;
