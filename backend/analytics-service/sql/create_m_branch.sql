-- ============================================================
-- ods.m_branch — master table of bank branches.
--
-- Runs directly against the altair_demo (analytics) database.
-- NOT managed by Flyway (consistent with the other ods.* tables).
--
-- Columns: id, code, name, description, created_ts, created_by,
--          updated_ts, updated_by.
--
-- Seed: distinct branch names from ods.demografi, with a generated
--       sequential code B001, B002, ... (ordered by branch name).
--       'Kantor Pusat' is forced to code B000 if present.
-- Idempotent: safe to re-run (INSERT ... ON CONFLICT DO NOTHING).
-- ============================================================

CREATE TABLE IF NOT EXISTS ods.m_branch (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_ts  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by  VARCHAR(100) NOT NULL DEFAULT 'system',
    updated_ts  TIMESTAMPTZ,
    updated_by  VARCHAR(100)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_m_branch_name ON ods.m_branch (name);

-- Seed from distinct branch names in ods.demografi.
-- Code = 'B' + zero-padded sequence number (B001, B002, ...),
-- numbered alphabetically by branch name.
INSERT INTO ods.m_branch (code, name, description, created_by)
SELECT
    'B' || LPAD(ROW_NUMBER() OVER (ORDER BY branch_name)::text, 3, '0') AS code,
    branch_name AS name,
    'Seeded from ods.demografi' AS description,
    'system' AS created_by
FROM (
    SELECT DISTINCT TRIM(branch_name) AS branch_name
    FROM ods.demografi
    WHERE branch_name IS NOT NULL
      AND TRIM(branch_name) <> ''
) d
ON CONFLICT (name) DO NOTHING;
