-- ============================================================
-- SEED DATA: Migrasi role lama + data awal permissions
-- Jalankan SETELAH 001_create_rbac_tables.sql
-- ============================================================

-- ============================
-- 1. Migrasi role dari kolom auth.users.role ke tabel auth.roles
-- ============================
INSERT INTO auth.roles (role_name, description, created_by)
SELECT DISTINCT role, 'Migrasi dari kolom role lama', 'migration'
FROM auth.users
WHERE role IS NOT NULL
ON CONFLICT (role_name) DO NOTHING;

-- ============================
-- 2. Migrasi user_roles berdasarkan kolom role lama
-- ============================
INSERT INTO auth.user_roles (user_id, role_id, created_by)
SELECT u.id, r.id, 'migration'
FROM auth.users u
JOIN auth.roles r ON r.role_name = u.role
WHERE u.role IS NOT NULL
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ============================
-- 3. Insert permissions (halaman/fitur yang tersedia)
-- ============================
INSERT INTO auth.permissions (permission_name, description, created_by) VALUES
('user_management', 'Halaman manajemen user (CRUD user)', 'admin'),
('role_management', 'Halaman manajemen role dan permission', 'admin'),
('change_password', 'Halaman ganti password sendiri', 'admin'),
('treasury_dashboard', 'Halaman dashboard treasury', 'admin'),
('treasury_transaction', 'Halaman transaksi treasury', 'admin'),
('marketing_dashboard', 'Halaman dashboard marketing', 'admin'),
('marketing_campaign', 'Halaman kampanye marketing', 'admin')
ON CONFLICT (permission_name) DO NOTHING;

-- ============================
-- 4. Assign permissions ke roles
-- ============================

-- ADMIN: akses semua
INSERT INTO auth.role_permissions (role_id, permission_id, created_by)
SELECT r.id, p.id, 'admin'
FROM auth.roles r, auth.permissions p
WHERE r.role_name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- MERCHANT_USER: hanya change_password
INSERT INTO auth.role_permissions (role_id, permission_id, created_by)
SELECT r.id, p.id, 'admin'
FROM auth.roles r, auth.permissions p
WHERE r.role_name = 'MERCHANT_USER' AND p.permission_name IN ('change_password')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- MERCHANT_CASHIER: hanya change_password
INSERT INTO auth.role_permissions (role_id, permission_id, created_by)
SELECT r.id, p.id, 'admin'
FROM auth.roles r, auth.permissions p
WHERE r.role_name = 'MERCHANT_CASHIER' AND p.permission_name IN ('change_password')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================
-- Verifikasi (opsional, uncomment untuk cek)
-- ============================
-- SELECT r.role_name, p.permission_name
-- FROM auth.role_permissions rp
-- JOIN auth.roles r ON r.id = rp.role_id
-- JOIN auth.permissions p ON p.id = rp.permission_id
-- ORDER BY r.role_name, p.permission_name;
