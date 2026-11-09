-- =============================================================================
-- Demographics PER SEGMENT for /segmentation/overview "Data Demografi" card.
-- Target DB: bag_demo (schema ods).
--
-- Source (per-customer, join is 100%):
--   segmentation.cluster_result  -> needs_cluster (segment 0..4), persona (name),
--                                   usia (age), gender, province
--   ods.h    (join h.customer_id::text  = cluster_result.customer_id)
--                                -> marital_status, occupation, educational_level
--   ods.mv_h (join m.customer_id::text = cluster_result.customer_id)
--                                -> status_nasabah (to EXCLUDE Dormant)
--
-- SEGMENTS: grouped by cluster_result.needs_cluster (0..4). Each cluster maps to
-- exactly one persona name (verified). Rows with needs_cluster = NULL ("Belum
-- Tersegmentasi") are EXCLUDED - they have no persona and are mostly Dormant.
-- NOTE: these 5 segments come straight from the per-customer table and do NOT
-- match the 4 clusters in segmentation.cluster_persona (different model/counts).
--
-- DORMANT EXCLUDED: consistent with Corporate Insight. Of 1,018,084 customers,
-- 638,981 are Dormant; all Dormant have needs_cluster = NULL, so filtering to
-- needs_cluster IS NOT NULL already drops every Dormant customer. The dormant
-- filter on ods.mv_h is kept explicit for clarity and safety.
--
-- Long format (same idea as ods.mv_ci_dist): one row per segment/metric/key
-- with Indonesian + English labels, a count and a sort order. 'segment' and
-- 'segment_name'/'segment_name_en' identify the persona. The frontend renders
-- the READY metrics (age, gender, marital, occupation) per segment; the MV also
-- stores education and province (not displayed yet).
--
--   metric in: 'age_bucket' | 'age_stats' | 'gender' | 'marital'
--            | 'occupation' | 'education' | 'province'
--
-- Data-quality decisions (verified against live data):
--   * age: outliers filtered to usia BETWEEN 17 AND 100. 'age_stats' carries
--     avg/min/max in stat_value.
--   * occupation / province: top 10 per segment by volume + 'Lainnya'/'Others'
--     tail so each segment card stays readable.
--   * education: raw numeric codes (100..199); no code->label mapping exists.
--     NOT displayed.
--
-- Reversible: DROP MATERIALIZED VIEW ods.mv_segment_demographics;
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS ods.mv_segment_demographics;

CREATE MATERIALIZED VIEW ods.mv_segment_demographics AS
WITH joined AS (
  SELECT
    cr.customer_id,
    cr.needs_cluster::int                AS segment,
    cr.usia,
    NULLIF(btrim(cr.gender), '')         AS gender,
    NULLIF(btrim(cr.province), '')       AS province,
    NULLIF(btrim(h.marital_status), '')  AS marital_status,
    NULLIF(btrim(h.occupation), '')      AS occupation,
    h.educational_level
  FROM segmentation.cluster_result cr
  JOIN ods.h    h ON h.customer_id::text = cr.customer_id
  JOIN ods.mv_h m ON m.customer_id::text = cr.customer_id
  WHERE cr.needs_cluster IS NOT NULL
    AND lower(btrim(m.status_nasabah)) <> 'dormant'
),
-- Stable segment -> persona name map (ID from cluster_result, EN inline).
seg_name AS (
  SELECT * FROM (VALUES
    (0, 'Penyimpan Muda',                        'Young Savers'),
    (1, 'Penyimpan Pengirim Uang Berkartu',      'Card-Holding Money Senders'),
    (2, 'Penyimpan Pengguna E-wallet Berkartu',  'Card-Holding E-wallet Users'),
    (3, 'Peminjam Berkartu',                     'Card-Holding Borrowers'),
    (4, 'Deposan Kaya Pembayar Tagihan Senior',  'Wealthy Senior Bill-Payers')
  ) AS t(segment, name_id, name_en)
),
occ_rank AS (
  SELECT segment, occupation, COUNT(*) AS cnt,
         row_number() OVER (PARTITION BY segment ORDER BY COUNT(*) DESC) AS rnk
  FROM joined WHERE occupation IS NOT NULL
  GROUP BY segment, occupation
),
prov_rank AS (
  SELECT segment, province, COUNT(*) AS cnt,
         row_number() OVER (PARTITION BY segment ORDER BY COUNT(*) DESC) AS rnk
  FROM joined WHERE province IS NOT NULL
  GROUP BY segment, province
),
rows AS (

-- 1) AGE BUCKETS (usia filtered 17..100) ------------------------------------
SELECT b.segment, 'age_bucket'::text AS metric, b.bucket AS key,
       b.bucket AS label_id, b.bucket AS label_en, b.cnt AS cnt,
       b.so AS sort_order, NULL::numeric AS stat_value
FROM (
  SELECT segment,
         CASE
           WHEN usia BETWEEN 17 AND 24 THEN '17-24'
           WHEN usia BETWEEN 25 AND 34 THEN '25-34'
           WHEN usia BETWEEN 35 AND 44 THEN '35-44'
           WHEN usia BETWEEN 45 AND 54 THEN '45-54'
           WHEN usia BETWEEN 55 AND 64 THEN '55-64'
           ELSE '65+'
         END AS bucket,
         COUNT(*) AS cnt,
         MIN(CASE
               WHEN usia BETWEEN 17 AND 24 THEN 0
               WHEN usia BETWEEN 25 AND 34 THEN 1
               WHEN usia BETWEEN 35 AND 44 THEN 2
               WHEN usia BETWEEN 45 AND 54 THEN 3
               WHEN usia BETWEEN 55 AND 64 THEN 4
               ELSE 5 END) AS so
  FROM joined WHERE usia BETWEEN 17 AND 100
  GROUP BY segment, 2
) b

UNION ALL
-- 2) AGE STATS (avg/min/max over 17..100): carried in stat_value -------------
SELECT segment, 'age_stats', 'avg', 'Rata-rata Usia', 'Average Age',
       COUNT(*), 0, round(avg(usia)::numeric, 1)
FROM joined WHERE usia BETWEEN 17 AND 100 GROUP BY segment
UNION ALL
SELECT segment, 'age_stats', 'min', 'Usia Termuda', 'Youngest Age',
       COUNT(*), 1, min(usia)::numeric
FROM joined WHERE usia BETWEEN 17 AND 100 GROUP BY segment
UNION ALL
SELECT segment, 'age_stats', 'max', 'Usia Tertua', 'Oldest Age',
       COUNT(*), 2, max(usia)::numeric
FROM joined WHERE usia BETWEEN 17 AND 100 GROUP BY segment

UNION ALL
-- 3) GENDER (NULL excluded) --------------------------------------------------
SELECT segment, 'gender', gender,
       CASE gender WHEN 'MALE' THEN 'Laki-laki' WHEN 'FEMALE' THEN 'Perempuan' ELSE gender END,
       CASE gender WHEN 'MALE' THEN 'Male' WHEN 'FEMALE' THEN 'Female' ELSE gender END,
       COUNT(*),
       CASE gender WHEN 'MALE' THEN 0 WHEN 'FEMALE' THEN 1 ELSE 2 END,
       NULL::numeric
FROM joined WHERE gender IS NOT NULL
GROUP BY segment, gender

UNION ALL
-- 4) MARITAL STATUS (NULL excluded) ------------------------------------------
SELECT segment, 'marital', marital_status,
       CASE marital_status
         WHEN 'SINGLE' THEN 'Lajang' WHEN 'MARRIED' THEN 'Menikah'
         WHEN 'DIVORCED' THEN 'Cerai' WHEN 'WIDOWED' THEN 'Janda/Duda'
         WHEN 'PARTNER' THEN 'Pasangan' WHEN 'OTHER' THEN 'Lainnya'
         ELSE initcap(lower(marital_status)) END,
       CASE marital_status
         WHEN 'SINGLE' THEN 'Single' WHEN 'MARRIED' THEN 'Married'
         WHEN 'DIVORCED' THEN 'Divorced' WHEN 'WIDOWED' THEN 'Widowed'
         WHEN 'PARTNER' THEN 'Partner' WHEN 'OTHER' THEN 'Other'
         ELSE initcap(lower(marital_status)) END,
       COUNT(*),
       CASE marital_status WHEN 'SINGLE' THEN 0 WHEN 'MARRIED' THEN 1
         WHEN 'DIVORCED' THEN 2 WHEN 'WIDOWED' THEN 3 WHEN 'PARTNER' THEN 4
         ELSE 9 END,
       NULL::numeric
FROM joined WHERE marital_status IS NOT NULL
GROUP BY segment, marital_status

UNION ALL
-- 5) OCCUPATION: top 10 per segment + 'Lainnya'/'Others' tail ----------------
SELECT segment, 'occupation', occupation, occupation, occupation,
       cnt, (rnk - 1)::int, NULL::numeric
FROM occ_rank WHERE rnk <= 10
UNION ALL
SELECT segment, 'occupation', 'OTHERS', 'Lainnya', 'Others',
       SUM(cnt), 99, NULL::numeric
FROM occ_rank WHERE rnk > 10 GROUP BY segment

UNION ALL
-- 6) EDUCATION (raw codes, NOT displayed; NULL excluded) ---------------------
SELECT segment, 'education', educational_level::text,
       'Kode ' || educational_level::text, 'Code ' || educational_level::text,
       COUNT(*), educational_level, NULL::numeric
FROM joined WHERE educational_level IS NOT NULL
GROUP BY segment, educational_level

UNION ALL
-- 7) PROVINCE: top 10 per segment + 'Lainnya' (NOT displayed) ----------------
SELECT segment, 'province', province, province, province,
       cnt, (rnk - 1)::int, NULL::numeric
FROM prov_rank WHERE rnk <= 10
UNION ALL
SELECT segment, 'province', 'OTHERS', 'Lainnya', 'Others',
       SUM(cnt), 99, NULL::numeric
FROM prov_rank WHERE rnk > 10 GROUP BY segment

)
SELECT
  r.segment,
  sn.name_id   AS segment_name,
  sn.name_en   AS segment_name_en,
  r.metric,
  r.key,
  r.label_id,
  r.label_en,
  r.cnt,
  r.sort_order,
  r.stat_value
FROM rows r
JOIN seg_name sn ON sn.segment = r.segment;

-- Fast lookup by segment + metric.
CREATE INDEX IF NOT EXISTS idx_mv_segment_demographics_seg_metric
  ON ods.mv_segment_demographics (segment, metric, sort_order);

-- ---------------------------------------------------------------------------
-- REFRESH (run after segmentation.cluster_result / ods.h / ods.mv_h refresh):
--   REFRESH MATERIALIZED VIEW ods.mv_segment_demographics;
-- ---------------------------------------------------------------------------
