-- =============================================================================
-- Churn Overview (/churn/overview) KPIs + per-branch distribution.
-- Target DB: bag_demo (schema churn).
--
-- Source: churn.churn_result (one row per customer, customer_id text).
--   Predicted Churn = customers with churn_proba >= 0.85 (9,381 of 222,484
--   analyzed). NOTE: churn.churn_result_old is deprecated — do NOT use it.
--   The page's Low/Med/High
--   tier split is NOT stored here: it is
--   derived in the frontend from the CHURN_TIER_DISTRIBUTION setting
--   (auth.setting_parameters, editable at /setup/threshold-churn) applied to
--   predictedChurn. The 12-month trend is likewise synthesised in the frontend.
--
-- Branch distribution joins churn_result -> ods.h (branch_code, 100% join) and
-- ods.m_branch for the readable name.
--
-- Two MVs:
--   churn.mv_churn_overview_kpi    : single row of headline KPIs.
--   churn.mv_churn_overview_branch : top-N branches by predicted-churn count.
--
-- Reversible: DROP MATERIALIZED VIEW churn.mv_churn_overview_kpi,
--             churn.mv_churn_overview_branch;
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Headline KPIs (single row).
--    at_risk_balance_juta is in millions of IDR (frontend multiplies back).
-- ---------------------------------------------------------------------------
-- Analyzed Customers counts INDIVIDUAL customers only (customer_type =
-- 'INDIVIDU'), consistent with the Corporate Insight "Active Customers" KPI.
-- All churn_result rows are active individuals, so this equals the active
-- individual count; the ~3.3k non-individual rows are excluded from every KPI.
DROP MATERIALIZED VIEW IF EXISTS churn.mv_churn_overview_kpi;
CREATE MATERIALIZED VIEW churn.mv_churn_overview_kpi AS
SELECT
  COUNT(*)                                                         AS total_nasabah,
  COUNT(*) FILTER (WHERE c.churn_proba >= 0.85)                     AS predicted_churn,
  ROUND(
    (COUNT(*) FILTER (WHERE c.churn_proba >= 0.85)::numeric
      / NULLIF(COUNT(*), 0) * 100), 2)                             AS churn_rate,
  ROUND(
    (COALESCE(SUM(c.rata_avg_balance) FILTER (WHERE c.churn_proba >= 0.85), 0))::numeric
      / 1e6, 2)                                                    AS at_risk_balance_juta
FROM churn.churn_result c
JOIN ods.h h ON h.customer_id::text = c.customer_id
WHERE h.customer_type = 'INDIVIDU';

-- ---------------------------------------------------------------------------
-- 2) Per-branch churn distribution (top 10 branches by predicted-churn count).
--    churn_rate = predicted-churn (churn_proba>=0.85) / total branch customers * 100.
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS churn.mv_churn_overview_branch;
CREATE MATERIALIZED VIEW churn.mv_churn_overview_branch AS
WITH j AS (
  SELECT h.branch_code,
         COUNT(*)                                       AS total_cnt,
         COUNT(*) FILTER (WHERE c.churn_proba >= 0.85)  AS churn_cnt
  FROM churn.churn_result c
  JOIN ods.h h ON h.customer_id::text = c.customer_id
  WHERE h.branch_code IS NOT NULL
  GROUP BY h.branch_code
)
SELECT
  j.branch_code,
  COALESCE(b.name, j.branch_code) AS branch_name,
  j.total_cnt,
  j.churn_cnt,
  ROUND((j.churn_cnt::numeric / NULLIF(j.total_cnt, 0) * 100), 2) AS churn_rate
FROM j
LEFT JOIN ods.m_branch b ON b.code = j.branch_code
ORDER BY j.churn_cnt DESC
LIMIT 10;

-- ---------------------------------------------------------------------------
-- REFRESH (run after churn.churn_result / ods.h / ods.m_branch refresh):
--   REFRESH MATERIALIZED VIEW churn.mv_churn_overview_kpi;
--   REFRESH MATERIALIZED VIEW churn.mv_churn_overview_branch;
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 3) Per-customer TRB (sum across accounts) from ods.trb_score.
--    Used by the Churn Ranking page's "TRB (million)" column so each request
--    reads a pre-aggregated 1-row-per-cif MV instead of grouping 816k rows live.
--    Note: ~78% of customers have TRB = 0 (zero-balance/inactive) which is real.
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS churn.mv_customer_trb;
CREATE MATERIALIZED VIEW churn.mv_customer_trb AS
SELECT cif, SUM(trb) AS trb
FROM ods.trb_score
GROUP BY cif;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_customer_trb_cif
  ON churn.mv_customer_trb (cif);

-- REFRESH (after ods.trb_score refresh):
--   REFRESH MATERIALIZED VIEW churn.mv_customer_trb;
