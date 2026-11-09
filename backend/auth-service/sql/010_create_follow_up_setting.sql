-- ============================================================
-- ods.follow_up_setting — "Setting Tindak Lanjut" per persona cluster.
--
-- Stores the follow-up offer parameters configured on the Hot Target page
-- (Bisnis Strategi Per Cluster) for a given segmentation cluster, optionally
-- scoped to a branch:
--   - branch IS NULL  -> global setting (configured by admin / HQ)
--   - branch = '<code>' -> branch-specific setting (configured by a branch RM)
--
-- Each row is one editable parameter: a name (free text, chosen from a master
-- list or typed), a value, and an optional unit (e.g. '%', 'Rp').
--
-- NOTE: This table lives in the `altair_demo` analytics database, which is NOT
-- managed by Flyway. Apply this file directly via psql against altair_demo.
-- (Kept here under auth-service/sql for version control / documentation.)
-- ============================================================

CREATE TABLE IF NOT EXISTS ods.follow_up_setting (
    id             bigserial PRIMARY KEY,
    cluster        varchar(50)  NOT NULL,        -- segmentation cluster, e.g. 'cluster_0'
    branch         varchar(50),                  -- NULL = global (admin/HQ); else branch code
    cif            varchar(50),                  -- NULL = cluster template; else per-customer override
    parameter_name varchar(150) NOT NULL,        -- e.g. 'Cashback QRIS', 'Rate'
    value          varchar(255),                 -- e.g. '3', '50000', 'true'
    unit           varchar(20),                  -- e.g. '%', 'Rp' (optional)
    sort_order     int          NOT NULL DEFAULT 0,
    is_active      boolean      NOT NULL DEFAULT true,
    created_date   date         DEFAULT CURRENT_DATE,
    execution_date date,                         -- when the follow-up plan is to be executed
    created_by     varchar(50),
    created_at     timestamptz  NOT NULL DEFAULT now(),
    updated_by     varchar(50),
    updated_at     timestamptz  NOT NULL DEFAULT now()
);

-- Fast lookup for the (cluster, branch) a page loads. A NULL branch is treated
-- as a distinct "global" scope.
CREATE INDEX IF NOT EXISTS idx_follow_up_setting_scope
    ON ods.follow_up_setting (cluster, branch);

-- Per-customer overrides are keyed by cif.
CREATE INDEX IF NOT EXISTS idx_follow_up_setting_cif
    ON ods.follow_up_setting (cif);
