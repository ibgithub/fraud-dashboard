-- Materialized view: profitability aggregates per branch.
-- The dashboard's slowest query (~7s) is a full scan of
-- profitability.customer_profitability grouped by cabang. This MV precomputes
-- that aggregation; the backend reads it instead of scanning the table live.
--
-- The backend derives from this MV: grand totals (SUM over all rows) and the
-- top-5 branches by net position.
--
-- Refresh (set up on a schedule separately, e.g. pg_cron every 15 min):
--   REFRESH MATERIALIZED VIEW CONCURRENTLY profitability.mv_profitability_by_branch;
-- (CONCURRENTLY works because of the unique index below.)
--
-- CREATE MATERIALIZED VIEW only reads the source table; it changes no data.
-- WITH DATA populates it immediately as part of this migration.

CREATE MATERIALIZED VIEW IF NOT EXISTS profitability.mv_profitability_by_branch AS
SELECT
    COALESCE(cabang, 'Lainnya')              AS bname,
    COALESCE(SUM(net_position), 0)           AS net_position,
    COALESCE(SUM(total_funding_balance), 0)  AS total_funding_balance,
    COALESCE(SUM(total_lending_balance), 0)  AS total_lending_balance
FROM profitability.customer_profitability
GROUP BY COALESCE(cabang, 'Lainnya')
WITH DATA;

-- Unique index on the group key -> enables REFRESH ... CONCURRENTLY later.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_profit_branch_bname
    ON profitability.mv_profitability_by_branch (bname);
