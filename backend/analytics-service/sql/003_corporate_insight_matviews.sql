-- =============================================================================
-- Corporate Insight (/corporate-insight) query tuning - Option A: summary MVs.
-- Target DB: bag_demo (schema ods).
--
-- The page shows only fixed aggregates (no dynamic filters), so we pre-compute
-- them into tiny materialized views. Each endpoint then does a trivial SELECT
-- (a few to ~61 rows) instead of scanning 1M-row ods.mv_h / 816k ods.trb_score.
--
-- Refresh these AFTER ods.mv_h / ods.trb_score are refreshed (see bottom).
-- All objects are reversible: DROP MATERIALIZED VIEW ods.mv_ci_*.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) KPI cards (single row): totals + funding/loan in Trillions.
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS ods.mv_ci_kpi;
CREATE MATERIALIZED VIEW ods.mv_ci_kpi AS
-- total_nasabah counts the WHOLE population (Dormant included) for the headline
-- KPI card; nasabah_dormant is shown as a sub-line underneath. Every other
-- metric on the page excludes Dormant.
-- Customer COUNTS are restricted to individual customers (customer_type =
-- 'INDIVIDU'); corporate/bank/government customers are excluded from the page's
-- headline counts. The funding/loan Trillion totals below intentionally do NOT
-- apply this filter (see note on the trb_score subqueries).
SELECT
  (SELECT COUNT(*) FROM ods.mv_h WHERE customer_type = 'INDIVIDU')            AS total_nasabah,
  (SELECT COUNT(*) FROM ods.mv_h WHERE customer_type = 'INDIVIDU' AND lower(btrim(status_nasabah)) = 'dormant') AS nasabah_dormant,
  (SELECT COUNT(*) FROM ods.mv_h WHERE customer_type = 'INDIVIDU' AND lower(status_nasabah) = 'active') AS nasabah_aktif,
  (SELECT COUNT(DISTINCT branch_code) FROM ods.mv_h
     WHERE customer_type = 'INDIVIDU' AND branch_code IS NOT NULL AND lower(btrim(status_nasabah)) <> 'dormant') AS cabang_cakupan,
  -- Exclude only customers KNOWN to be Dormant in mv_h. trb_score rows whose cif
  -- is absent from mv_h are kept (no Dormant evidence -> treated as non-Dormant),
  -- otherwise ~7.9T of loan on orphan cifs would be silently dropped.
  -- NOTE: funding/loan are deliberately NOT restricted to customer_type =
  -- 'INDIVIDU'. Applying that filter collapses the totals (funding ~6.6T, loan
  -- negative) because most large balances sit on cifs not matched as INDIVIDU in
  -- mv_h. These are real balances, so the Trillion headlines keep the original
  -- (non-dormant-only, orphan-kept) logic; only the customer COUNTS are INDIVIDU.
  (SELECT (COALESCE(SUM(t.saving),0) + COALESCE(SUM(t.deposito),0)) / 1e12
     FROM ods.trb_score t
     WHERE NOT EXISTS (SELECT 1 FROM ods.mv_h m
                       WHERE m.customer_id = t.cif
                         AND lower(btrim(m.status_nasabah)) = 'dormant')) AS funding_t,
  (SELECT COALESCE(SUM(t.outstanding),0) / 1e12
     FROM ods.trb_score t
     WHERE NOT EXISTS (SELECT 1 FROM ods.mv_h m
                       WHERE m.customer_id = t.cif
                         AND lower(btrim(m.status_nasabah)) = 'dormant')) AS loan_t;

-- ---------------------------------------------------------------------------
-- 2) Per-branch table + TRB (one row per branch, ~61 rows).
--    total/aktif from mv_h; total_trb from positive per-cif TRB joined to mv_h.
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS ods.mv_ci_branch;
CREATE MATERIALIZED VIEW ods.mv_ci_branch AS
-- Dormant customers are excluded across the whole page. Customer COUNTS
-- (total/aktif) are restricted to individual customers; the per-branch TRB
-- total below keeps the original logic (not INDIVIDU-filtered) so the branch
-- TRB tab stays consistent with the funding/loan Trillion headlines.
WITH cust AS (
  SELECT branch_code,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE lower(status_nasabah) = 'active') AS aktif
  FROM ods.mv_h
  WHERE customer_type = 'INDIVIDU' AND branch_code IS NOT NULL
    AND lower(btrim(status_nasabah)) <> 'dormant'
  GROUP BY branch_code
),
trb_cif AS (
  SELECT cif, SUM(trb) AS trb FROM ods.trb_score GROUP BY cif
),
trb_branch AS (
  SELECT m.branch_code, SUM(t.trb) AS total_trb
  FROM ods.mv_h m
  JOIN trb_cif t ON t.cif = m.customer_id
  WHERE t.trb > 0 AND m.branch_code IS NOT NULL
    AND lower(btrim(m.status_nasabah)) <> 'dormant'
  GROUP BY m.branch_code
)
SELECT
  c.branch_code,
  COALESCE(b.name, c.branch_code) AS branch_name,
  c.total,
  c.aktif,
  COALESCE(tb.total_trb, 0)       AS total_trb
FROM cust c
LEFT JOIN ods.m_branch b   ON b.code = c.branch_code
LEFT JOIN trb_branch tb    ON tb.branch_code = c.branch_code;

CREATE INDEX IF NOT EXISTS idx_mv_ci_branch_total ON ods.mv_ci_branch (total DESC);

-- ---------------------------------------------------------------------------
-- 3) Distributions (long format): segment (s), customer status, MB adoption,
--    MB activity status (MB users only). A few rows total.
--    metric in: 'segment' | 'status' | 'mb' | 'mb_status'
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS ods.mv_ci_dist;
CREATE MATERIALIZED VIEW ods.mv_ci_dist AS
  -- Segment (TRB pie): Dormant customers excluded.
  SELECT 'segment'::text AS metric,
         s::text         AS key,
         'Segmen ' || s  AS label_id,
         'Segment ' || s AS label_en,
         COUNT(*)        AS cnt,
         s::int          AS sort_order
  FROM ods.mv_h
  WHERE customer_type = 'INDIVIDU' AND s IS NOT NULL AND lower(btrim(status_nasabah)) <> 'dormant'
  GROUP BY s
UNION ALL
  -- Customer status: Active vs Inactive over the WHOLE individual population.
  -- Active   = individual customers with status_nasabah = 'active'.
  -- Inactive = everyone else (Total Customers - Active), i.e. inactive + dormant
  --            + zero-balance, so the two slices sum to Total Customers.
  SELECT 'status', 'active'::text, 'Aktif'::text, 'Active'::text,
         (SELECT COUNT(*) FROM ods.mv_h
          WHERE customer_type='INDIVIDU' AND lower(btrim(status_nasabah))='active')::bigint,
         0
  UNION ALL
  SELECT 'status', 'inactive'::text, 'Tidak Aktif'::text, 'Inactive'::text,
         (SELECT COUNT(*) FROM ods.mv_h WHERE customer_type='INDIVIDU')::bigint
         - (SELECT COUNT(*) FROM ods.mv_h
            WHERE customer_type='INDIVIDU' AND lower(btrim(status_nasabah))='active')::bigint,
         1
UNION ALL
  -- MB adoption against the WHOLE individual population:
  --   MB User     = ACTIVE individual customers registered on MB (mb='Y').
  --   Non-MB User = everyone else (Total Customers - MB User), so the two
  --                 slices sum to Total Customers and the % reflect the whole base.
  SELECT 'mb', 'Y'::text, 'Pengguna MB'::text, 'MB User'::text,
         (SELECT COUNT(*) FROM ods.mv_h
          WHERE customer_type='INDIVIDU' AND lower(btrim(status_nasabah))='active'
            AND mb IS NOT NULL AND btrim(mb) <> '' AND upper(btrim(mb))='Y')::bigint,
         0
  UNION ALL
  SELECT 'mb', 'N'::text, 'Bukan Pengguna MB'::text, 'Non-MB User'::text,
         (SELECT COUNT(*) FROM ods.mv_h WHERE customer_type='INDIVIDU')::bigint
         - (SELECT COUNT(*) FROM ods.mv_h
            WHERE customer_type='INDIVIDU' AND lower(btrim(status_nasabah))='active'
              AND mb IS NOT NULL AND btrim(mb) <> '' AND upper(btrim(mb))='Y')::bigint,
         1
UNION ALL
  -- MB activity status for MB users, ACTIVE individual customers only.
  SELECT 'mb_status',
         lower(btrim(mb_status)),
         CASE WHEN lower(btrim(mb_status))='active' THEN 'Aktif' ELSE 'Tidak Aktif' END,
         CASE WHEN lower(btrim(mb_status))='active' THEN 'Active' ELSE 'Inactive' END,
         COUNT(*),
         CASE WHEN lower(btrim(mb_status))='active' THEN 0 ELSE 1 END
  FROM ods.mv_h
  WHERE customer_type = 'INDIVIDU' AND upper(btrim(mb))='Y' AND mb_status IS NOT NULL AND btrim(mb_status) <> ''
    AND lower(btrim(status_nasabah)) = 'active'
  GROUP BY lower(btrim(mb_status));

-- ---------------------------------------------------------------------------
-- REFRESH (run after ods.mv_h + ods.trb_score are refreshed; schedule e.g.
-- via pg_cron or an external cron right after the base MV refresh job):
--   REFRESH MATERIALIZED VIEW ods.mv_ci_kpi;
--   REFRESH MATERIALIZED VIEW ods.mv_ci_branch;
--   REFRESH MATERIALIZED VIEW ods.mv_ci_dist;
-- ---------------------------------------------------------------------------
