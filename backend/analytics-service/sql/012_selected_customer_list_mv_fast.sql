-- =============================================================================
-- ods.mv_selected_customer_list  (REBUILD — faster refresh)
--
-- WHY: the "Continue" button on the Customer Matrix page refreshes this MV
-- synchronously, and the original query took ~9.6 s. Root cause (confirmed via
-- EXPLAIN ANALYZE): the big tables were joined to the tiny selected set with
-- ::text casts on the LARGE side (h.customer_id::text, mv_customer_trb.cif::text)
-- and no indexes on the text join columns (cluster_result.customer_id,
-- churn_result.customer_id, h.customer_id). That forced full Seq Scans +
-- external-merge sorts of 0.76M–1.0M-row tables on every refresh.
--
-- FIX (two parts):
--   1. Join indexes added below (so the ~10k selected CIFs probe via index).
--   2. Cast the TINY selected set to bigint (cif::bigint) and join against the
--      NATIVE bigint columns (h.customer_id, mv_customer_trb.cif) so their
--      btree indexes are usable, instead of casting the big column to text.
--   All selected CIFs are numeric (verified), so cif::bigint is safe.
--
-- RESULT: refresh drops from ~9.6 s to ~5 s (full join turns from Seq-Scan +
-- disk-sort into nested-loop index lookups over the selected set).
-- =============================================================================

-- --- 1. Join indexes on the text/bigint keys (idempotent) -------------------
CREATE INDEX IF NOT EXISTS idx_cluster_result_customer_id
  ON segmentation.cluster_result (customer_id);
CREATE INDEX IF NOT EXISTS idx_churn_result_customer_id
  ON churn.churn_result (customer_id);
CREATE INDEX IF NOT EXISTS idx_ods_h_customer_id
  ON ods.h (customer_id);

-- --- 2. Rebuild the MV with native-type joins -------------------------------
DROP MATERIALIZED VIEW IF EXISTS ods.mv_selected_customer_list;

CREATE MATERIALIZED VIEW ods.mv_selected_customer_list AS
WITH sel AS (
  SELECT cif FROM ods.churn_data_matrix WHERE is_selected = true
  UNION SELECT cif FROM ods.activity_data_matrix WHERE is_selected = true),
seln AS (
  SELECT cif, cif::bigint AS cif_num FROM sel)
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
FROM seln s
LEFT JOIN churn.churn_result c            ON c.customer_id = s.cif
LEFT JOIN ods.churn_data_matrix cm        ON cm.cif = s.cif
LEFT JOIN ods.activity_data_matrix am     ON am.cif = s.cif
LEFT JOIN churn.mv_customer_trb t         ON t.cif = s.cif_num
LEFT JOIN segmentation.cluster_result cr  ON cr.customer_id = s.cif
LEFT JOIN ods.h h                         ON h.customer_id = s.cif_num
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
