-- =============================================================================
-- ods.mv_selected_customer_list  (MATERIALIZED VIEW)
--
-- Pre-joined, one-row-per-CIF snapshot of the SELECTED customers (is_selected
-- in either bag matrix) used by the Action Plan Detail (promo-engine) page.
--
-- WHY: the live query joined the ~28k selected CIFs against million-row tables
-- (ods.h 1.0M, segmentation.cluster_result 1.0M, churn.mv_customer_trb 0.76M,
-- churn.churn_result 0.28M) through ::text-cast join keys. The casts defeated
-- every index, so Postgres full-scanned + external-merge-sorted those tables on
-- each page load => ~9 s per request. This MV collapses the whole join into a
-- tiny (~30k-row) pre-computed table; the page query becomes an index scan that
-- runs in well under 1 ms.
--
-- SHAPE: raw numeric cluster columns (needs_cluster / mb_archetype) are stored
-- so the Java layer keeps doing the persona-name + action mapping exactly as
-- before. Both acquisition (action_acq) and retention (action_ret) actions are
-- precomputed so a single MV serves both tabs.
--
-- DEDUP: ods.activity_data_matrix has one row per (cif, activity_category), so
-- the raw join fans out a CIF into multiple rows. DISTINCT ON (cif) keeps one
-- deterministic row per CIF (trb_category is identical per cif). This also
-- fixes duplicate CIFs that the old live query could show.
--
-- REFRESH: a dedicated pg_cron job refreshes this MV CONCURRENTLY every few
-- minutes (see 004_pg_cron_refresh.sql, job 'refresh-selected-customer-list'),
-- so the Action Plan Detail list catches up a few minutes after the Customer
-- Matrix selection changes. CONCURRENTLY needs the UNIQUE index below and never
-- blocks readers. (It is also refreshed by the 6-hourly corporate-insight job.)
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS ods.mv_selected_customer_list;

CREATE MATERIALIZED VIEW ods.mv_selected_customer_list AS
WITH sel AS (
  SELECT cif FROM ods.churn_data_matrix WHERE is_selected = true
  UNION SELECT cif FROM ods.activity_data_matrix WHERE is_selected = true)
SELECT DISTINCT ON (s.cif)
  s.cif                                              AS cif,
  ROUND(c.churn_index::numeric,1)                    AS churn_idx,
  c.churn_index                                      AS churn_index_raw,
  COALESCE(cm.trb_category, am.trb_category)         AS trb_category,
  ROUND(COALESCE(t.trb,0)::numeric,0)                AS trb,
  cr.needs_cluster::int                              AS needs_cluster,
  cr.mb_archetype::int                               AS mb_archetype,
  COALESCE(h.branch_code, 'N/A')                     AS branch_code,
  reca.recommendation_type                           AS action_acq,
  recr.recommendation_type                           AS action_ret
FROM sel s
LEFT JOIN churn.churn_result c            ON c.customer_id = s.cif
LEFT JOIN ods.churn_data_matrix cm        ON cm.cif = s.cif
LEFT JOIN ods.activity_data_matrix am     ON am.cif = s.cif
LEFT JOIN churn.mv_customer_trb t         ON t.cif::text = s.cif
LEFT JOIN segmentation.cluster_result cr  ON cr.customer_id = s.cif
LEFT JOIN ods.h h                         ON h.customer_id::text = s.cif
LEFT JOIN segmentation.cluster_result_aggregate reca ON reca.cluster_id = cr.needs_cluster::int
LEFT JOIN segmentation.persona_strategi_retensi recr
       ON NULLIF(btrim(recr.mb_archetype),'')::int = cr.mb_archetype::int
ORDER BY s.cif, am.trb_category NULLS LAST;

-- Unique key => enables REFRESH MATERIALIZED VIEW CONCURRENTLY + point lookups.
CREATE UNIQUE INDEX uidx_mv_selected_customer_list_cif
  ON ods.mv_selected_customer_list (cif);
-- Filter columns (persona cluster per tab + branch) and the churn-index sort.
CREATE INDEX idx_mv_scl_needs    ON ods.mv_selected_customer_list (needs_cluster);
CREATE INDEX idx_mv_scl_arch     ON ods.mv_selected_customer_list (mb_archetype);
CREATE INDEX idx_mv_scl_branch   ON ods.mv_selected_customer_list (branch_code);
CREATE INDEX idx_mv_scl_churnidx ON ods.mv_selected_customer_list (churn_index_raw DESC NULLS LAST);

ANALYZE ods.mv_selected_customer_list;
