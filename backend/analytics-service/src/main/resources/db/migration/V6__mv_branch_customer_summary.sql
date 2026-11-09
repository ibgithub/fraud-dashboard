-- Materialized view: per-branch customer summary (for Corporate Insight).
--
-- Replaces three live aggregations over ods.demografi (joined to
-- churn.pred_result) that together cost ~1.2s per dashboard load:
--   - countBranches          (COUNT DISTINCT branch_name)
--   - getBranchCustomerTable (total / active / pct per branch)
--   - getBranchDistribution  (customer_status = 1 count per branch, top 5)
--
-- One row per branch. The backend reads this MV (18 rows) in milliseconds.
--   total_cnt   : customers in the branch (all rows in ods.demografi)
--   active_cnt  : customers present in churn.pred_result (the "active" set)
--   status1_cnt : customers with customer_status = 1
--   pct_active  : active_cnt / total_cnt * 100
--
-- Refresh (via pg_cron, same as the other MVs):
--   REFRESH MATERIALIZED VIEW CONCURRENTLY ods.mv_branch_customer_summary;
-- (CONCURRENTLY works because of the unique index below.)

CREATE MATERIALIZED VIEW IF NOT EXISTS ods.mv_branch_customer_summary AS
SELECT
    COALESCE(d.branch_name, 'Lainnya')                          AS bname,
    COUNT(d.cust_no)                                            AS total_cnt,
    COUNT(pr.cif)                                               AS active_cnt,
    COUNT(*) FILTER (WHERE d.customer_status = 1)               AS status1_cnt,
    ROUND((COUNT(pr.cif)::numeric
           / NULLIF(COUNT(d.cust_no), 0) * 100)::numeric, 2)    AS pct_active
FROM ods.demografi d
LEFT JOIN churn.pred_result pr ON pr.cif = d.cust_no
GROUP BY COALESCE(d.branch_name, 'Lainnya')
WITH DATA;

-- Unique index on the group key -> enables REFRESH ... CONCURRENTLY later.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_branch_summary_bname
    ON ods.mv_branch_customer_summary (bname);
