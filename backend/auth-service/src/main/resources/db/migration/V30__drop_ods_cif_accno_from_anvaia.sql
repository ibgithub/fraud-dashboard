-- ============================================================
-- V30: Drop ods.cif_accno from the auth-service database (anvaia).
--
-- V29 mistakenly created and seeded ods.cif_accno in the `anvaia`
-- database (the one auth-service / Flyway manages). The table actually
-- belongs in the `altair_demo` analytics database, alongside the other
-- ods.* tables, and is created there via direct SQL (outside Flyway).
--
-- This migration removes the misplaced copy from `anvaia`. Idempotent.
-- ============================================================

DROP INDEX IF EXISTS ods.idx_cif_accno_cif;
DROP INDEX IF EXISTS ods.idx_cif_accno_acct_no;
DROP TABLE IF EXISTS ods.cif_accno;
