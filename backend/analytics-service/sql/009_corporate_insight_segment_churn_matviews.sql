-- =============================================================================
-- Corporate Insight (/corporate-insight) query tuning (phase 2) - summary MVs
-- for the three remaining live-join queries that dominated page load time.
-- Target DB: bag_demo (schemas segmentation + churn).
--
-- Before: these three endpoints joined cluster_result / churn_result against
-- the 1M-row ods.mv_h / ods.h on every request:
--   getSegmentByPersona   ~1,100 ms
--   getSegmentByArchetype ~1,010 ms
--   getChurnByBranch      ~  595 ms   (added with the new Churn tab)
-- Together ~2.7 s = ~97% of the ~2.8 s backend time.
--
-- After: each endpoint reads a tiny pre-computed MV (5 / 5 / 60 rows) in ~7 ms,
-- mirroring the Option-A pattern in 003_corporate_insight_matviews.sql.
--
-- Refresh these together with the other CI MVs (see 004_pg_cron_refresh.sql,
-- which has been updated to include them). All objects are reversible:
--   DROP MATERIALIZED VIEW segmentation.mv_ci_segment_persona;
--   DROP MATERIALIZED VIEW segmentation.mv_ci_segment_archetype;
--   DROP MATERIALIZED VIEW churn.mv_ci_branch_churn;
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Customer count per PERSONA CLUSTER (needs_cluster 0..4), non-dormant.
--    Backs the "All-Channel Activation" pie. 5 rows.
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS segmentation.mv_ci_segment_persona;
CREATE MATERIALIZED VIEW segmentation.mv_ci_segment_persona AS
SELECT cr.needs_cluster::int        AS cid,
       cra.nama_persona             AS name_id,
       cra.nama_persona_en          AS name_en,
       COUNT(*)                     AS cnt
FROM segmentation.cluster_result cr
JOIN ods.mv_h m ON m.customer_id::text = cr.customer_id
LEFT JOIN segmentation.cluster_result_aggregate cra ON cra.cluster_id = cr.needs_cluster::int
WHERE cr.needs_cluster IS NOT NULL
  AND m.customer_type = 'INDIVIDU'
  AND lower(btrim(m.status_nasabah)) <> 'dormant'
GROUP BY cr.needs_cluster, cra.nama_persona, cra.nama_persona_en
ORDER BY cr.needs_cluster;

-- ---------------------------------------------------------------------------
-- 2) Customer count per RETENTION ARCHETYPE (mb_archetype 0..4), non-dormant.
--    Backs the "Mobile Banking Activation" pie. 5 rows.
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS segmentation.mv_ci_segment_archetype;
CREATE MATERIALIZED VIEW segmentation.mv_ci_segment_archetype AS
SELECT cr.mb_archetype::int         AS aid,
       psr.nama_persona             AS name_id,
       psr.nama_persona_en          AS name_en,
       COUNT(*)                     AS cnt
FROM segmentation.cluster_result cr
JOIN ods.mv_h m ON m.customer_id::text = cr.customer_id
LEFT JOIN segmentation.persona_strategi_retensi psr
       ON NULLIF(btrim(psr.mb_archetype),'')::int = cr.mb_archetype::int
WHERE cr.mb_archetype IS NOT NULL
  AND m.customer_type = 'INDIVIDU'
  AND lower(btrim(m.status_nasabah)) <> 'dormant'
GROUP BY cr.mb_archetype, psr.nama_persona, psr.nama_persona_en
ORDER BY cr.mb_archetype;

-- ---------------------------------------------------------------------------
-- 3) Churn rate (%) per branch (ALL branches), from churn.churn_result joined
--    to ods.h / ods.m_branch. Churn rate = share with churn_proba > 0.7 (the
--    "Predicted Churn" definition). Backs the Churn tab. ~60 rows.
--    NOTE: ordering is done at read time in the repository so the UI slider can
--    rank branches; the MV just stores the per-branch aggregates.
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS churn.mv_ci_branch_churn;
CREATE MATERIALIZED VIEW churn.mv_ci_branch_churn AS
WITH j AS (
  SELECT h.branch_code                   AS branch_code,
         COALESCE(b.name, h.branch_code) AS branch_name,
         COUNT(*)                        AS total_cnt,
         COUNT(*) FILTER (WHERE c.churn_proba > 0.7) AS churn_cnt
  FROM churn.churn_result c
  JOIN ods.h h ON h.customer_id::text = c.customer_id
  LEFT JOIN ods.m_branch b ON b.code = h.branch_code
  WHERE h.branch_code IS NOT NULL AND h.customer_type = 'INDIVIDU'
  GROUP BY h.branch_code, COALESCE(b.name, h.branch_code)
)
SELECT branch_code,
       branch_name,
       total_cnt,
       churn_cnt,
       ROUND((churn_cnt::numeric / NULLIF(total_cnt,0)) * 100, 2) AS churn_rate
FROM j;

-- ---------------------------------------------------------------------------
-- REFRESH (run after the base MVs / source tables are refreshed). These are
-- included in ods.refresh_corporate_insight() (see 004_pg_cron_refresh.sql):
--   REFRESH MATERIALIZED VIEW segmentation.mv_ci_segment_persona;
--   REFRESH MATERIALIZED VIEW segmentation.mv_ci_segment_archetype;
--   REFRESH MATERIALIZED VIEW churn.mv_ci_branch_churn;
-- ---------------------------------------------------------------------------
