-- ============================================================
-- V28: Role-based PII privilege — allow specific roles to view
--   unmasked customer names. Default false (names are masked).
-- ============================================================

ALTER TABLE auth.roles
    ADD COLUMN IF NOT EXISTS can_view_customer_name boolean NOT NULL DEFAULT false;
