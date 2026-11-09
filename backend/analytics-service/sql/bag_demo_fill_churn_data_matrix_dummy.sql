-- Fill ods.churn_data_matrix with DUMMY data (Churn x TRB).
-- Run against database: bag_demo
--
-- One row per customer. churn_category is pseudo-random (deterministic hash of
-- cif) so the 9-cell matrix is populated plausibly; trb_category reuses the
-- real TRB tier (34|33|33 over trb>0, no-TRB -> lo) so the TRB axis is sensible.
-- matrix_classification = <trb_tier>_<churn_tier>. is_selected = false.

TRUNCATE ods.churn_data_matrix RESTART IDENTITY;

WITH trb AS (
    SELECT cif, SUM(trb) AS trb FROM ods.trb_score GROUP BY cif
), cut AS (
    SELECT PERCENTILE_CONT(1.0 - 0.34)          WITHIN GROUP (ORDER BY trb) AS tr_hi,
           PERCENTILE_CONT(1.0 - (0.34 + 0.33)) WITHIN GROUP (ORDER BY trb) AS tr_med
    FROM trb WHERE trb > 0
), base AS (
    SELECT m.customer_id AS cif, COALESCE(t.trb, 0) AS trb
    FROM ods.mv_h m
    LEFT JOIN trb t ON t.cif = m.customer_id
    -- Exclude dormant customers (consistent with the activity matrix / donuts).
    WHERE LOWER(TRIM(m.status_nasabah)) <> 'dormant'
), tiered AS (
    SELECT b.cif,
           CASE WHEN b.trb >= c.tr_hi THEN 'hi'
                WHEN b.trb >= c.tr_med THEN 'med'
                ELSE 'lo' END AS trb_tier,
           -- Deterministic pseudo-random churn tier from the cif hash (0..99).
           (('x' || substr(md5(b.cif::text), 1, 8))::bit(32)::bigint % 100 + 100) % 100 AS h
    FROM base b CROSS JOIN cut c
)
INSERT INTO ods.churn_data_matrix
    (cif, churn_category, trb_category, matrix_classification, is_selected)
SELECT cif,
       churn_tier,
       trb_tier,
       trb_tier || '_' || churn_tier,
       false
FROM (
    SELECT cif, trb_tier,
           CASE WHEN h < 34 THEN 'hi'          -- ~34% high churn
                WHEN h < 67 THEN 'med'          -- ~33% medium
                ELSE 'lo' END AS churn_tier     -- ~33% low
    FROM tiered
) s;
