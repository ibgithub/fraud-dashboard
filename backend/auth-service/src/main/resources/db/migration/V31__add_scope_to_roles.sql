-- ============================================================
-- V31: Add scope (Pusat/Cabang) to auth.roles.
--
-- scope_type : 'PUSAT' or 'CABANG'. Defaults to 'PUSAT' so all
--              existing roles remain head-office scope.
-- branch_code: the branch this role is scoped to when scope_type
--              = 'CABANG'. NULL for PUSAT roles.
--
-- For now these columns are metadata only (shown/edited in Role
-- Management). Data filtering by branch can be wired later.
-- Idempotent.
-- ============================================================

ALTER TABLE auth.roles
    ADD COLUMN IF NOT EXISTS scope_type  VARCHAR(10) NOT NULL DEFAULT 'PUSAT';

ALTER TABLE auth.roles
    ADD COLUMN IF NOT EXISTS branch_code VARCHAR(50);

-- Guard: a CABANG role must have a branch_code; a PUSAT role must not.
ALTER TABLE auth.roles
    DROP CONSTRAINT IF EXISTS chk_roles_scope;

ALTER TABLE auth.roles
    ADD CONSTRAINT chk_roles_scope CHECK (
        (scope_type = 'PUSAT'  AND branch_code IS NULL) OR
        (scope_type = 'CABANG' AND branch_code IS NOT NULL)
    );
