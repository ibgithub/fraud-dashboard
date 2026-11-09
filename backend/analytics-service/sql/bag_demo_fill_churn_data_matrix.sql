-- =============================================================================
-- Fill ods.churn_data_matrix (bag_demo) from churn.churn_result.
--
-- Population: PREDICTED-CHURN customers only — churn.churn_result where
--   churn_proba > 0.85 (~11,681). (Previously this used every customer; the
--   matrix now covers only the predicted-churn population.)
--
-- Tiers are PERCENTILE-based, driven by the tier-distribution settings in
-- auth.setting_parameters (DB anvaia). The percent split points are declared
-- once in the `params` CTE below — if the settings change, update them here and
-- re-run this script. Current values:
--   CHURN_TIER_DISTRIBUTION = 39|25|36  (Hi | Med | Lo)
--   TRB_TIER_DISTRIBUTION   = 34|33|33  (Hi | Med | Lo)
--
--   churn_category : by churn_result.churn_proba, over the predicted-churn pop.
--       Hi = top 39% proba, Med = next 25%, Lo = bottom 36%.
--   trb_category   : by per-customer TRB (SUM of ods.trb_score.trb) over the
--       predicted-churn customers with positive TRB.
--       Hi = top 34%, Med = next 33%, Lo = bottom 33%.
--       Customers with no TRB row (or trb <= 0) are tiered 'lo' (no balance).
--
--   matrix_classification = '<trb>_<churn>'  (e.g. 'hi_hi', 'lo_med').
--   is_selected = false (selection is set later by the UI).
--
-- Idempotent: TRUNCATE then INSERT.
-- Run against database: bag_demo
-- =============================================================================

TRUNCATE TABLE ods.churn_data_matrix RESTART IDENTITY;

WITH params AS (
  -- Percent split points (Hi | Med) from the tier-distribution settings.
  SELECT 0.39::numeric AS churn_hi, 0.25::numeric AS churn_med,
         0.34::numeric AS trb_hi,   0.33::numeric AS trb_med
),
-- Predicted-churn population with its per-customer TRB (SUM across accounts).
pred AS (
  SELECT c.customer_id AS cif,
         c.churn_proba,
         COALESCE(t.trb, 0) AS trb
  FROM churn.churn_result c
  LEFT JOIN (SELECT cif, SUM(trb) AS trb FROM ods.trb_score GROUP BY cif) t
         ON t.cif::text = c.customer_id
  WHERE c.churn_proba > 0.85
),
churn_cut AS (
  -- Hi = top churn_hi% -> cut at the (1 - churn_hi) percentile;
  -- Med floor at the (1 - churn_hi - churn_med) percentile. Over predicted pop.
  SELECT
    PERCENTILE_CONT(1.0 - (SELECT churn_hi FROM params))
      WITHIN GROUP (ORDER BY churn_proba) AS hi_cut,
    PERCENTILE_CONT(1.0 - ((SELECT churn_hi FROM params) + (SELECT churn_med FROM params)))
      WITHIN GROUP (ORDER BY churn_proba) AS med_cut
  FROM pred
),
trb_cut AS (
  -- Hi = top trb_hi%; Med floor at (1 - trb_hi - trb_med). Positive-TRB only.
  SELECT
    PERCENTILE_CONT(1.0 - (SELECT trb_hi FROM params))
      WITHIN GROUP (ORDER BY trb) AS hi_cut,
    PERCENTILE_CONT(1.0 - ((SELECT trb_hi FROM params) + (SELECT trb_med FROM params)))
      WITHIN GROUP (ORDER BY trb) AS med_cut
  FROM pred WHERE trb > 0
)
INSERT INTO ods.churn_data_matrix
  (cif, churn_category, trb_category, matrix_classification, is_selected)
SELECT
  p.cif,
  cc.churn_cat,
  tc.trb_cat,
  tc.trb_cat || '_' || cc.churn_cat AS matrix_classification,
  false
FROM pred p
CROSS JOIN churn_cut ch
CROSS JOIN trb_cut tr
-- churn tier (by churn_proba; higher proba = higher risk)
CROSS JOIN LATERAL (
  SELECT CASE
           WHEN p.churn_proba >= ch.hi_cut  THEN 'hi'
           WHEN p.churn_proba >= ch.med_cut THEN 'med'
           ELSE 'lo'
         END AS churn_cat
) cc
-- trb tier (no TRB / non-positive -> lo)
CROSS JOIN LATERAL (
  SELECT CASE
           WHEN p.trb <= 0          THEN 'lo'
           WHEN p.trb >= tr.hi_cut  THEN 'hi'
           WHEN p.trb >= tr.med_cut THEN 'med'
           ELSE 'lo'
         END AS trb_cat
) tc;

-- Quick verification (counts per cell + total should be ~11,681):
-- SELECT trb_category, churn_category, COUNT(*) FROM ods.churn_data_matrix
--   GROUP BY 1,2 ORDER BY 1,2;
-- SELECT COUNT(*) FROM ods.churn_data_matrix;
