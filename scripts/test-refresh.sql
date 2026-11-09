-- Manually invoke the refresh function to confirm it runs end-to-end.
\timing on
SELECT ods.refresh_corporate_insight();

-- Confirm the summary MVs have rows after refresh.
SELECT 'mv_ci_kpi'    AS mv, COUNT(*) FROM ods.mv_ci_kpi
UNION ALL SELECT 'mv_ci_branch', COUNT(*) FROM ods.mv_ci_branch
UNION ALL SELECT 'mv_ci_dist',   COUNT(*) FROM ods.mv_ci_dist;

-- Show the schedule once more.
SELECT jobid, schedule, jobname, active FROM cron.job;
