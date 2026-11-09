-- ============================================================
-- DDL + Data: Setting Parameters
-- ============================================================

CREATE TABLE auth.setting_parameters (
    id serial4 PRIMARY KEY,
    name varchar(100) NOT NULL UNIQUE,
    value varchar(255) NOT NULL,
    description varchar(255),
    created_by varchar(20) NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_by varchar(20),
    updated_at timestamp
);

-- Data awal
INSERT INTO auth.setting_parameters (name, value, description, created_by) VALUES
('MAX_WRONG_PASSWORD', '5', 'Maksimal percobaan login gagal sebelum akun terkunci', 'admin'),
('LOCKOUT_DURATION_MINUTES', '30', 'Durasi lock akun (menit) setelah MAX_WRONG_PASSWORD terlampaui', 'admin'),
('SESSION_TIMEOUT_MINUTES', '60', 'Timeout sesi user (menit)', 'admin'),
('PASSWORD_EXPIRY_DAYS', '90', 'Masa berlaku password (hari)', 'admin'),
('PASSWORD_MIN_LENGTH', '8', 'Panjang minimal password', 'admin'),
('JWT_EXPIRATION_HOURS', '1', 'Masa berlaku JWT token (jam)', 'admin');
