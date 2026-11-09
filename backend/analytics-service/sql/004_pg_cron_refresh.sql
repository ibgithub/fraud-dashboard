-- =============================================================================
-- pg_cron setup: schedule corporate-insight materialized view refresh.
-- Target DB: bag_demo. Run as master user (anvaia) after pg_cron is enabled
-- in shared_preload_libraries (requires RDS reboot - done separately).
--
-- Schedule: 00/06/12/18 WIB == 17,23,05,11 UTC (RDS cron runs in UTC).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Refresh function: base MV first, then the summary MVs in dependency order.
-- trb_score is a TABLE (populated by upstream ETL), so it is NOT refreshed here.
-- NOTE: this function is owned by the RDS master role (postgres); the three
-- new CI segment/churn REFRESH lines must be applied by the master user. The
-- MVs themselves are created and populated under the app role (anvaia).
CREATE OR REPLACE FUNCTION ods.refresh_corporate_insight()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW ods.mv_h;
  REFRESH MATERIALIZED VIEW ods.mv_ci_kpi;
  REFRESH MATERIALIZED VIEW ods.mv_ci_branch;
  REFRESH MATERIALIZED VIEW ods.mv_ci_dist;
  -- Segmentation needs-cluster aggregate (depends on cluster_result + mv_h).
  REFRESH MATERIALIZED VIEW segmentation.cluster_result_aggregate;
  -- Product Recommendations per cluster + per retention archetype
  -- (depend on cluster_result + mv_h).
  REFRESH MATERIALIZED VIEW segmentation.mv_recommender_cluster;
  REFRESH MATERIALIZED VIEW segmentation.mv_recommender_archetype;
  -- Retention-side demographics per archetype (depends on cluster_result + h + mv_h).
  REFRESH MATERIALIZED VIEW ods.mv_archetype_demographics;
  -- CI segment pies + churn-per-branch (depend on cluster_result / churn_result + mv_h / h).
  REFRESH MATERIALIZED VIEW segmentation.mv_ci_segment_persona;
  REFRESH MATERIALIZED VIEW segmentation.mv_ci_segment_archetype;
  REFRESH MATERIALIZED VIEW churn.mv_ci_branch_churn;
  -- Product Usage Analysis acquisition/retention (depend on cluster_result + mv_h).
  REFRESH MATERIALIZED VIEW segmentation.mv_pu_acquisition;
  REFRESH MATERIALIZED VIEW segmentation.mv_pu_retention;
  -- Promo-engine Action Plan Detail list (selected customers; also refreshed
  -- interactively on every matrix-selection save). CONCURRENTLY needs the MV's
  -- unique index and keeps the page readable during refresh.
  REFRESH MATERIALIZED VIEW CONCURRENTLY ods.mv_selected_customer_list;
END;
$$;

-- (Re)create the schedule. Unschedule first if it already exists (idempotent).
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'refresh-corporate-insight';

SELECT cron.schedule(
  'refresh-corporate-insight',
  '0 17,23,5,11 * * *',
  $$SELECT ods.refresh_corporate_insight();$$
);

-- -----------------------------------------------------------------------------
-- Promo-engine Action Plan Detail list: ods.mv_selected_customer_list.
-- The selected set changes interactively on the Customer Matrix page, so this
-- MV gets its own frequent (every 5 minutes) CONCURRENTLY refresh, independent
-- of the 6-hourly corporate-insight job, so the list catches up quickly after
-- a selection change without a per-save refresh on the request thread.
-- CONCURRENTLY requires the MV's unique index and never blocks readers.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ods.refresh_selected_customer_list()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ods.mv_selected_customer_list;
EXCEPTION WHEN OTHERS THEN
  -- CONCURRENTLY fails if the MV was never populated; fall back to a plain refresh.
  REFRESH MATERIALIZED VIEW ods.mv_selected_customer_list;
END;
$$;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'refresh-selected-customer-list';

SELECT cron.schedule(
  'refresh-selected-customer-list',
  '*/5 * * * *',
  $$SELECT ods.refresh_selected_customer_list();$$
);

-- Let the application role see the cron catalog (read-only visibility).
GRANT USAGE ON SCHEMA cron TO anvaia;
GRANT SELECT ON cron.job, cron.job_run_details TO anvaia;

-- Show the result.
SELECT jobid, schedule, jobname, database, active FROM cron.job;
