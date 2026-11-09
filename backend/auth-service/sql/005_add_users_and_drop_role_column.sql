-- ============================================================
-- Tambah user untuk tiap role + drop kolom role dari auth.users
-- Password: 'password123' (bcrypt)
-- ============================================================

-- 1. Insert user baru (password: password123)
INSERT INTO auth.users (username, email, password, first_name, last_name, created_by) VALUES
('treasury1', 'treasury1@bank.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Budi', 'Treasury', 'admin'),
('marketing1', 'marketing1@bank.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Sari', 'Marketing', 'admin'),
('lending1', 'lending1@bank.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Andi', 'Lending', 'admin');

-- 2. Assign role ke user baru
INSERT INTO auth.user_roles (user_id, role_id, created_by)
SELECT u.id, r.id, 'admin'
FROM auth.users u, auth.roles r
WHERE u.username = 'treasury1' AND r.role_name = 'TREASURY';

INSERT INTO auth.user_roles (user_id, role_id, created_by)
SELECT u.id, r.id, 'admin'
FROM auth.users u, auth.roles r
WHERE u.username = 'marketing1' AND r.role_name = 'MARKETING';

INSERT INTO auth.user_roles (user_id, role_id, created_by)
SELECT u.id, r.id, 'admin'
FROM auth.users u, auth.roles r
WHERE u.username = 'lending1' AND r.role_name = 'LENDING';

-- 3. Drop kolom role dari auth.users (sudah tidak dipakai)
ALTER TABLE auth.users DROP COLUMN IF EXISTS role;

-- ============================================================
-- Verifikasi
-- ============================================================
-- SELECT u.username, r.role_name
-- FROM auth.users u
-- JOIN auth.user_roles ur ON ur.user_id = u.id
-- JOIN auth.roles r ON r.id = ur.role_id
-- ORDER BY u.username;
