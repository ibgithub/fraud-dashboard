-- ============================================================
-- MIGRATION: Hapus permissions, ganti dengan menu + role_menus
-- Jalankan SETELAH tabel auth.menu sudah dibuat dan di-seed
-- ============================================================

-- 1. Hapus tabel permissions lama
DROP TABLE IF EXISTS auth.role_permissions;
DROP TABLE IF EXISTS auth.permissions;

-- 2. Buat junction table role <-> menu
CREATE TABLE auth.role_menus (
    role_id int4 NOT NULL,
    menu_id int4 NOT NULL,
    created_by varchar(20) NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT role_menus_pkey PRIMARY KEY (role_id, menu_id),
    CONSTRAINT role_menus_role_fk FOREIGN KEY (role_id) REFERENCES auth.roles(id) ON DELETE CASCADE,
    CONSTRAINT role_menus_menu_fk FOREIGN KEY (menu_id) REFERENCES auth.menu(id) ON DELETE CASCADE
);

-- 3. Assign semua menu ke role ADMIN
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, m.id, 'admin'
FROM auth.roles r, auth.menu m
WHERE r.role_name = 'ADMIN'
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- 4. Contoh: assign menu tertentu ke role lain (sesuaikan nanti)
-- MERCHANT_USER: hanya Dashboard Eksekutif (M1) + Settings change password
-- INSERT INTO auth.role_menus (role_id, menu_id, created_by)
-- SELECT r.id, m.id, 'admin'
-- FROM auth.roles r, auth.menu m
-- WHERE r.role_name = 'MERCHANT_USER'
-- AND m.code IN ('M1', 'M1.1', 'M1.2', 'M1.3', 'M1.4', 'M1.5', 'M8', 'M8.4')
-- ON CONFLICT (role_id, menu_id) DO NOTHING;
