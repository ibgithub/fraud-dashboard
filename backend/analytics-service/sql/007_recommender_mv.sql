-- =============================================================================
-- segmentation.mv_recommender_cluster
-- Pre-aggregated Top recommendations per needs-cluster (non-dormant), so the
-- Product Recommendations page reads a tiny table instead of scanning mv_h.
--
-- Long format: one row per (cluster_id, kind, rec_name) with the count across
-- the 3 ranked recommendation columns.
--   kind: 'banking'  (recommended_banking_product_1..3)
--       | 'service'  (recommended_transaction_service_1..3)
--
-- Refresh after cluster_result / ods.mv_h refresh:
--   REFRESH MATERIALIZED VIEW segmentation.mv_recommender_cluster;
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS segmentation.mv_recommender_cluster;

CREATE MATERIALIZED VIEW segmentation.mv_recommender_cluster AS
WITH nd AS (
  -- non-dormant customers with their needs_cluster + the 6 rec columns
  SELECT cr.needs_cluster::int AS cluster_id,
         cr.recommended_banking_product_1    AS b1,
         cr.recommended_banking_product_2    AS b2,
         cr.recommended_banking_product_3    AS b3,
         cr.recommended_transaction_service_1 AS s1,
         cr.recommended_transaction_service_2 AS s2,
         cr.recommended_transaction_service_3 AS s3
  FROM segmentation.cluster_result cr
  JOIN ods.mv_h m ON m.customer_id::text = cr.customer_id
  WHERE cr.needs_cluster IS NOT NULL
    AND lower(btrim(m.status_nasabah)) <> 'dormant'
),
pop AS (
  SELECT cluster_id, COUNT(*) AS total FROM nd GROUP BY cluster_id
),
banking AS (
  SELECT cluster_id, rec FROM (
    SELECT cluster_id, b1 AS rec FROM nd
    UNION ALL SELECT cluster_id, b2 FROM nd
    UNION ALL SELECT cluster_id, b3 FROM nd
  ) x WHERE btrim(coalesce(rec,'')) <> ''
),
service AS (
  SELECT cluster_id, rec FROM (
    SELECT cluster_id, s1 AS rec FROM nd
    UNION ALL SELECT cluster_id, s2 FROM nd
    UNION ALL SELECT cluster_id, s3 FROM nd
  ) x WHERE btrim(coalesce(rec,'')) <> ''
)
SELECT b.cluster_id, 'banking'::text AS kind, b.rec AS rec_name,
       COUNT(*)::bigint AS cnt,
       p.total::bigint  AS cluster_total
FROM banking b JOIN pop p ON p.cluster_id = b.cluster_id
GROUP BY b.cluster_id, b.rec, p.total
UNION ALL
SELECT s.cluster_id, 'service', s.rec,
       COUNT(*)::bigint, p.total::bigint
FROM service s JOIN pop p ON p.cluster_id = s.cluster_id
GROUP BY s.cluster_id, s.rec, p.total;

CREATE INDEX IF NOT EXISTS idx_mv_recommender_cluster
  ON segmentation.mv_recommender_cluster (cluster_id, kind, cnt DESC);
