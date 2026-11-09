-- Materialized view: product adoption counts (for the Corporate Insight
-- "Top Products" card).
--
-- The live query (GROUP BY product_name with COUNT(DISTINCT cust_no) over the
-- whole recommender.cust_data table) is the dashboard's slowest step (~3.3s).
-- This MV precomputes one row per product; the backend reads it and just
-- ORDER BY ... LIMIT 3 (milliseconds).
--
-- Refresh (set up on a schedule separately, e.g. pg_cron):
--   REFRESH MATERIALIZED VIEW CONCURRENTLY recommender.mv_top_products;
-- (CONCURRENTLY works because of the unique index below.)
--
-- CREATE MATERIALIZED VIEW only reads the source table; it changes no data.
-- WITH DATA populates it immediately as part of this migration.

CREATE MATERIALIZED VIEW IF NOT EXISTS recommender.mv_top_products AS
SELECT
    product_name,
    MAX(product_type)         AS product_type,
    COUNT(DISTINCT cust_no)   AS users_cnt
FROM recommender.cust_data
GROUP BY product_name
WITH DATA;

-- Unique index on the group key -> enables REFRESH ... CONCURRENTLY later.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_products_name
    ON recommender.mv_top_products (product_name);
