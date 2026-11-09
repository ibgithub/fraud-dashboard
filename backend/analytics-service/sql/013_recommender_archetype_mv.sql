-- =============================================================================
-- segmentation.mv_recommender_archetype
-- Retention counterpart of segmentation.mv_recommender_cluster: pre-aggregated
-- Top recommendations per RETENTION ARCHETYPE (mb_archetype 0..4, non-dormant),
-- so the Product Recommendations page (Mobile Banking tab) reads a tiny table
-- instead of scanning mv_h.
--
-- Long format: one row per (archetype_id, kind, rec_name) with the count across
-- the 3 ranked recommendation columns.
--   kind: 'banking'  (recommended_banking_product_1..3)
--       | 'service'  (recommended_transaction_service_1..3)
--
-- Refresh after cluster_result / ods.mv_h refresh:
--   REFRESH MATERIALIZED VIEW segmentation.mv_recommender_archetype;
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS segmentation.mv_recommender_archetype;

CREATE MATERIALIZED VIEW segmentation.mv_recommender_archetype AS
WITH nd AS (
  -- non-dormant customers with their mb_archetype + the 6 rec columns
  SELECT cr.mb_archetype::int AS archetype_id,
         cr.recommended_banking_product_1    AS b1,
         cr.recommended_banking_product_2    AS b2,
         cr.recommended_banking_product_3    AS b3,
         cr.recommended_transaction_service_1 AS s1,
         cr.recommended_transaction_service_2 AS s2,
         cr.recommended_transaction_service_3 AS s3
  FROM segmentation.cluster_result cr
  JOIN ods.mv_h m ON m.customer_id::text = cr.customer_id
  WHERE cr.mb_archetype IS NOT NULL
    AND lower(btrim(m.status_nasabah)) <> 'dormant'
),
pop AS (
  SELECT archetype_id, COUNT(*) AS total FROM nd GROUP BY archetype_id
),
banking AS (
  SELECT archetype_id, rec FROM (
    SELECT archetype_id, b1 AS rec FROM nd
    UNION ALL SELECT archetype_id, b2 FROM nd
    UNION ALL SELECT archetype_id, b3 FROM nd
  ) x WHERE btrim(coalesce(rec,'')) <> ''
),
service AS (
  SELECT archetype_id, rec FROM (
    SELECT archetype_id, s1 AS rec FROM nd
    UNION ALL SELECT archetype_id, s2 FROM nd
    UNION ALL SELECT archetype_id, s3 FROM nd
  ) x WHERE btrim(coalesce(rec,'')) <> ''
)
SELECT b.archetype_id, 'banking'::text AS kind, b.rec AS rec_name,
       COUNT(*)::bigint AS cnt,
       p.total::bigint  AS cluster_total
FROM banking b JOIN pop p ON p.archetype_id = b.archetype_id
GROUP BY b.archetype_id, b.rec, p.total
UNION ALL
SELECT s.archetype_id, 'service', s.rec,
       COUNT(*)::bigint, p.total::bigint
FROM service s JOIN pop p ON p.archetype_id = s.archetype_id
GROUP BY s.archetype_id, s.rec, p.total;

CREATE INDEX IF NOT EXISTS idx_mv_recommender_archetype
  ON segmentation.mv_recommender_archetype (archetype_id, kind, cnt DESC);
