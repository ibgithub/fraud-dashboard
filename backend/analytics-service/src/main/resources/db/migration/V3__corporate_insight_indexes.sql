-- Corporate Insight performance indexes.
-- These speed up the /api/v1/executive/corporate-insight dashboard aggregation,
-- join and sort queries. Indexes only ADD structure; they do not change data.
--
-- NOTE: Flyway runs each migration inside a transaction, so CREATE INDEX
-- CONCURRENTLY (which cannot run in a transaction) is NOT used here. On an
-- existing large table these take a brief lock; run during a maintenance window
-- if the target table is heavily written. IF NOT EXISTS makes them idempotent /
-- safe if the index was already created manually.

CREATE INDEX IF NOT EXISTS idx_cp_cabang_netpos
    ON profitability.customer_profitability (cabang) INCLUDE (net_position);

CREATE INDEX IF NOT EXISTS idx_cp_netpos_desc
    ON profitability.customer_profitability (net_position DESC);

CREATE INDEX IF NOT EXISTS idx_cp_cust_no
    ON profitability.customer_profitability (cust_no);

CREATE INDEX IF NOT EXISTS idx_recommender_product_cust
    ON recommender.cust_data (product_name, cust_no);

CREATE INDEX IF NOT EXISTS idx_demografi_cust_no
    ON ods.demografi (cust_no);

CREATE INDEX IF NOT EXISTS idx_pred_result_cif
    ON churn.pred_result (cif);

CREATE INDEX IF NOT EXISTS idx_trb_custno_pos
    ON ods.trb (cust_no) INCLUDE (trb) WHERE trb > 0;

CREATE INDEX IF NOT EXISTS idx_seg_persona
    ON segmentation.pred_result (persona_name);
