-- ============================================================
-- CLEANUP: Bersihkan data lama dan set role baru untuk bank
-- ============================================================

-- 1. Hapus semua data junction lama
DELETE FROM auth.role_menus;
DELETE FROM auth.user_roles;

-- 2. Hapus role lama (dari project sebelumnya)
DELETE FROM auth.roles;

-- 3. Insert role baru untuk bank
INSERT INTO auth.roles (role_name, description, created_by) VALUES
('ADMIN', 'Administrator - akses penuh ke semua menu', 'admin'),
('TREASURY', 'Divisi Treasury', 'admin'),
('MARKETING', 'Divisi Marketing', 'admin'),
('LENDING', 'Divisi Lending/Kredit', 'admin');

-- 4. Bersihkan user lama (dari project merchant), sisakan admin saja
DELETE FROM auth.users WHERE id != 1;

-- 5. Update user admin - hapus kolom role lama, set bersih
UPDATE auth.users SET role = 'ADMIN' WHERE id = 1;

-- 6. Assign role ADMIN ke user admin (id=1)
INSERT INTO auth.user_roles (user_id, role_id, created_by)
SELECT 1, r.id, 'admin'
FROM auth.roles r
WHERE r.role_name = 'ADMIN';

-- 7. Assign SEMUA menu ke role ADMIN
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, m.id, 'admin'
FROM auth.roles r, auth.menu m
WHERE r.role_name = 'ADMIN';

-- 8. Contoh: assign menu ke TREASURY (sesuaikan nanti lewat UI)
-- M1 (Executive Dashboard) + M4 (Profitability) + M7 (Reports)
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, m.id, 'admin'
FROM auth.roles r, auth.menu m
WHERE r.role_name = 'TREASURY'
AND (m.code LIKE 'M1%' OR m.code LIKE 'M4%' OR m.code LIKE 'M7%');

-- 9. Contoh: assign menu ke MARKETING
-- M1 (Executive Dashboard) + M2 (Segmentation) + M5 (Recommendation) + M7 (Reports)
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, m.id, 'admin'
FROM auth.roles r, auth.menu m
WHERE r.role_name = 'MARKETING'
AND (m.code LIKE 'M1%' OR m.code LIKE 'M2%' OR m.code LIKE 'M5%' OR m.code LIKE 'M7%');

-- 10. Contoh: assign menu ke LENDING
-- M1 (Executive Dashboard) + M3 (Churn) + M6 (Customer Profile) + M7 (Reports)
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, m.id, 'admin'
FROM auth.roles r, auth.menu m
WHERE r.role_name = 'LENDING'
AND (m.code LIKE 'M1%' OR m.code LIKE 'M3%' OR m.code LIKE 'M6%' OR m.code LIKE 'M7%');

-- ============================================================
-- Verifikasi (uncomment untuk cek)
-- ============================================================
-- SELECT r.role_name, count(rm.menu_id) as total_menu
-- FROM auth.roles r
-- LEFT JOIN auth.role_menus rm ON rm.role_id = r.id
-- GROUP BY r.role_name ORDER BY r.role_name;
--
-- SELECT * FROM auth.users;
-- SELECT * FROM auth.user_roles;
