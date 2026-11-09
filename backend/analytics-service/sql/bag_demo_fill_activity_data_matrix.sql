-- Fill ods.activity_data_matrix (Activity x TRB) from real bag_demo data.
-- Run against database: bag_demo
--
-- Activity segments OVERLAP (a customer can be in more than one), so the table
-- stores one row per (cif, activity_category). TRB tier uses percentile cutoffs
-- over the trb>0 population with distribution 34|33|33 (Hi|Med|Lo) read from the
-- TRB_TIER_DISTRIBUTION setting in the anvaia DB (snapshotted here). Customers
-- with no positive TRB fall into the 'lo' tier.

-- 1) Restructure for overlap: unique per (cif, activity_category), not per cif.
ALTER TABLE ods.activity_data_matrix DROP CONSTRAINT IF EXISTS activity_data_matrix_cif_key;
DROP INDEX IF EXISTS ods.uidx_ods_activity_data_matrix_cif;
CREATE UNIQUE INDEX IF NOT EXISTS uidx_ods_activity_data_matrix_cif_cat
    ON ods.activity_data_matrix (cif, activity_category);

-- Widen category / classification columns: activity codes (e.g. 'inactive_cust')
-- and matrix_classification (e.g. 'hi_inactive_cust') exceed the original
-- varchar(10) carried over from the churn table.
ALTER TABLE ods.activity_data_matrix ALTER COLUMN activity_category     TYPE varchar(32);
ALTER TABLE ods.activity_data_matrix ALTER COLUMN matrix_classification TYPE varchar(40);

-- 2) Fresh load.
TRUNCATE ods.activity_data_matrix RESTART IDENTITY;

-- 3) Build per-customer TRB tier, then emit one row per activity segment.
WITH trb AS (
    SELECT cif, SUM(trb) AS trb FROM ods.trb_score GROUP BY cif
), cut AS (
    -- Cutoffs over the POSITIVE-TRB population. Hi = top 34%, Med = next 33%.
    SELECT PERCENTILE_CONT(1.0 - 0.34)          WITHIN GROUP (ORDER BY trb) AS tr_hi,
           PERCENTILE_CONT(1.0 - (0.34 + 0.33)) WITHIN GROUP (ORDER BY trb) AS tr_med
    FROM trb WHERE trb > 0
), base AS (
    SELECT m.customer_id AS cif,
           m.status_nasabah,
           m.mb,
           m.mb_status,
           COALESCE(t.trb, 0) AS trb
    FROM ods.mv_h m
    LEFT JOIN trb t ON t.cif = m.customer_id
    -- Same population as the Corporate Insight donuts: INDIVIDUAL customers,
    -- Dormant excluded. (customer_type + non-dormant.)
    WHERE m.customer_type = 'INDIVIDU'
      AND LOWER(TRIM(m.status_nasabah)) <> 'dormant'
), tiered AS (
    SELECT b.cif,
           b.status_nasabah, b.mb, b.mb_status,
           CASE
             WHEN b.trb >= c.tr_hi  THEN 'hi'
             WHEN b.trb >= c.tr_med THEN 'med'
             ELSE 'lo'                        -- includes trb <= 0 / no trb row
           END AS trb_tier
    FROM base b CROSS JOIN cut c
), seg AS (
    -- Expand each customer into the activity segment(s) they belong to.
    -- Definitions mirror the Corporate Insight donuts (individual, non-dormant):
    --   inactive_cust = status <> 'active'            (the "Inactive" count)
    --   non_mb        = ACTIVE customers not on MB     (Unregistered MB)
    --   inactive_mb   = ACTIVE MB users, mb_status inactive (Inactive MB)
    SELECT cif, 'inactive_cust' AS activity_category, trb_tier
    FROM tiered
    WHERE status_nasabah IS NOT NULL AND TRIM(status_nasabah) <> ''
      AND LOWER(TRIM(status_nasabah)) <> 'active'
    UNION ALL
    SELECT cif, 'non_mb', trb_tier
    FROM tiered
    WHERE LOWER(TRIM(status_nasabah)) = 'active'
      AND mb IS NOT NULL AND TRIM(mb) <> '' AND UPPER(TRIM(mb)) = 'N'
    UNION ALL
    SELECT cif, 'inactive_mb', trb_tier
    FROM tiered
    WHERE LOWER(TRIM(status_nasabah)) = 'active'
      AND mb IS NOT NULL AND TRIM(mb) <> '' AND UPPER(TRIM(mb)) = 'Y'
      AND mb_status IS NOT NULL AND TRIM(mb_status) <> '' AND LOWER(TRIM(mb_status)) = 'inactive'
)
INSERT INTO ods.activity_data_matrix
    (cif, activity_category, trb_category, matrix_classification, is_selected)
SELECT cif,
       activity_category,
       trb_tier,
       trb_tier || '_' || activity_category,
       false
FROM seg;
