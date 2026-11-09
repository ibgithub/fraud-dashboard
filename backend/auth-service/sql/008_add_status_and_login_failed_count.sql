-- ============================================================
-- ALTER: Tambah kolom status dan login_failed_count ke auth.users
-- status: 1=ACTIVE, 2=BLOCKED
-- ============================================================

ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS status int4 DEFAULT 1 NOT NULL;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS login_failed_count int4 DEFAULT 0 NOT NULL;

-- Set semua user yang ada jadi ACTIVE
UPDATE auth.users SET status = 1, login_failed_count = 0;

-- Hapus LOCKOUT_DURATION_MINUTES (tidak dipakai, akun langsung block)
DELETE FROM auth.setting_parameters WHERE name = 'LOCKOUT_DURATION_MINUTES';
