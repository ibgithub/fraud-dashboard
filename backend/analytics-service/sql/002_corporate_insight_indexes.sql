-- =============================================================================
-- Corporate Insight (/corporate-insight) query tuning - Option B: indexes.
-- Target DB: bag_demo (schema ods). All reversible (DROP INDEX ...).
-- Idempotent (IF NOT EXISTS). Indexes on the materialized view ods.mv_h are
-- maintained on REFRESH.
--
-- Measured effect (RDS, warm, via psql):
--   Q2 active count     260ms -> 43ms   (idx_mv_h_lower_status)
--   Q3 distinct branch  635ms -> 130ms  (idx_mv_h_branch_code)
--   Q7 trb by branch    1.8s  -> ~1.0s  (idx_trb_score_cif)
--   Q8 segment count    175ms -> 58ms   (idx_mv_h_s)
--   Q11 mb_status (Y)   350ms -> 84ms   (idx_mv_h_upper_mb)
-- Full-table aggregates (Q6/Q9/Q10) stay ~0.4-0.5s: a plain index cannot speed
-- up "aggregate every row"; those need a summary materialized view (Option A).
-- =============================================================================

-- Q7 (heaviest): SUM(trb) per cif + join to mv_h.customer_id
CREATE INDEX IF NOT EXISTS idx_trb_score_cif     ON ods.trb_score (cif);

-- Q3 / Q6 / Q7: group & join by branch_code
CREATE INDEX IF NOT EXISTS idx_mv_h_branch_code  ON ods.mv_h (branch_code);

-- Q2 / Q9: WHERE/GROUP on LOWER(status_nasabah)
CREATE INDEX IF NOT EXISTS idx_mv_h_lower_status ON ods.mv_h (lower(status_nasabah));

-- Q10 / Q11: GROUP/WHERE on UPPER(TRIM(mb))
CREATE INDEX IF NOT EXISTS idx_mv_h_upper_mb     ON ods.mv_h (upper(btrim(mb)));

-- Q8: GROUP BY s
CREATE INDEX IF NOT EXISTS idx_mv_h_s            ON ods.mv_h (s);

-- Refresh planner statistics so the new indexes are considered.
ANALYZE ods.trb_score;
ANALYZE ods.mv_h;
