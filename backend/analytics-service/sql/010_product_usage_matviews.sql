-- =============================================================================
-- Segmentation Product Usage (/segmentation/product-usage) query tuning -
-- summary MVs for the two aggregate queries that made the page load slowly.
-- Target DB: bag_demo (schema segmentation).
--
-- Before: both endpoints aggregated segmentation.cluster_result joined to the
-- 1M-row ods.mv_h (just for the non-dormant filter) on every request:
--   /product-usage            (acquisition, per needs_cluster)  ~1,100 ms
--   /product-usage-retention  (per mb_archetype)                ~1,000 ms
-- The frontend fires both in parallel, so the page waited ~1.1 s on the backend.
--
-- After: each endpoint reads a tiny pre-computed MV (5 rows) in ~8 ms. Persona
-- names are baked into the MV so the repository read is a trivial SELECT.
-- Mirrors the Option-A pattern in 003_corporate_insight_matviews.sql and
-- 009_corporate_insight_segment_churn_matviews.sql.
--
-- Each row holds the per-cluster/archetype adoption % for the six products:
--   tabungan_pct, deposito_pct, kredit_pct, giro_pct, kartu_pct, mb_pct
-- Refresh together with the other segmentation MVs (see 004_pg_cron_refresh.sql).
-- Reversible: DROP MATERIALIZED VIEW segmentation.mv_pu_acquisition / _retention.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Acquisition: product adoption % per PERSONA CLUSTER (needs_cluster 0..4),
--    non-dormant. 5 rows. Persona names from cluster_result_aggregate.
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS segmentation.mv_pu_acquisition;
CREATE MATERIALIZED VIEW segmentation.mv_pu_acquisition AS
WITH agg AS (
  SELECT cr.needs_cluster::int AS cluster_id,
         COUNT(*)              AS total_cnt,
         round(avg((cr.punya_tabungan > 0)::int)::numeric*100,2) AS tabungan_pct,
         round(avg((cr.punya_deposito > 0)::int)::numeric*100,2) AS deposito_pct,
         round(avg((cr.punya_kredit  > 0)::int)::numeric*100,2) AS kredit_pct,
         round(avg((cr.punya_giro    > 0)::int)::numeric*100,2) AS giro_pct,
         round(avg((cr.punya_kartu)::int)::numeric*100,2)       AS kartu_pct,
         round(avg((cr.status_mb <> 'non_mb')::int)::numeric*100,2) AS mb_pct
  FROM segmentation.cluster_result cr
  JOIN ods.mv_h m ON m.customer_id::text = cr.customer_id
  WHERE cr.needs_cluster IS NOT NULL
    AND m.customer_type = 'INDIVIDU'
    AND lower(btrim(m.status_nasabah)) <> 'dormant'
  GROUP BY cr.needs_cluster
)
SELECT a.cluster_id, a.total_cnt,
       a.tabungan_pct, a.deposito_pct, a.kredit_pct, a.giro_pct, a.kartu_pct, a.mb_pct,
       cra.nama_persona    AS name_id,
       cra.nama_persona_en AS name_en
FROM agg a
LEFT JOIN segmentation.cluster_result_aggregate cra ON cra.cluster_id = a.cluster_id;

-- ---------------------------------------------------------------------------
-- 2) Retention: product adoption % per RETENTION ARCHETYPE (mb_archetype 0..4),
--    non-dormant. 5 rows. Archetype names from persona_strategi_retensi.
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS segmentation.mv_pu_retention;
CREATE MATERIALIZED VIEW segmentation.mv_pu_retention AS
WITH agg AS (
  SELECT cr.mb_archetype::int AS archetype_id,
         COUNT(*)             AS total_cnt,
         round(avg((cr.punya_tabungan > 0)::int)::numeric*100,2) AS tabungan_pct,
         round(avg((cr.punya_deposito > 0)::int)::numeric*100,2) AS deposito_pct,
         round(avg((cr.punya_kredit  > 0)::int)::numeric*100,2) AS kredit_pct,
         round(avg((cr.punya_giro    > 0)::int)::numeric*100,2) AS giro_pct,
         round(avg((cr.punya_kartu)::int)::numeric*100,2)       AS kartu_pct,
         round(avg((cr.status_mb <> 'non_mb')::int)::numeric*100,2) AS mb_pct
  FROM segmentation.cluster_result cr
  JOIN ods.mv_h m ON m.customer_id::text = cr.customer_id
  WHERE cr.mb_archetype IS NOT NULL
    AND m.customer_type = 'INDIVIDU'
    AND lower(btrim(m.status_nasabah)) <> 'dormant'
  GROUP BY cr.mb_archetype
)
SELECT a.archetype_id, a.total_cnt,
       a.tabungan_pct, a.deposito_pct, a.kredit_pct, a.giro_pct, a.kartu_pct, a.mb_pct,
       psr.nama_persona    AS name_id,
       psr.nama_persona_en AS name_en
FROM agg a
LEFT JOIN segmentation.persona_strategi_retensi psr ON psr.mb_archetype = a.archetype_id;

-- ---------------------------------------------------------------------------
-- REFRESH (run after cluster_result / ods.mv_h are refreshed). Included in
-- ods.refresh_corporate_insight() (see 004_pg_cron_refresh.sql):
--   REFRESH MATERIALIZED VIEW segmentation.mv_pu_acquisition;
--   REFRESH MATERIALIZED VIEW segmentation.mv_pu_retention;
-- ---------------------------------------------------------------------------
