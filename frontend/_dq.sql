-- Reproduce Hot Target DATA query (with segmentation join) for Hi_Hi+Med_Med, settings 51|25|24 / 49|33|18
WITH cut AS (
  SELECT
    PERCENTILE_CONT(0.49) WITHIN GROUP (ORDER BY "confidence(true)") AS ch_hi,
    PERCENTILE_CONT(0.24) WITHIN GROUP (ORDER BY "confidence(true)") AS ch_med,
    PERCENTILE_CONT(0.51) WITHIN GROUP (ORDER BY (current_saving_balance + current_deposit_balance)) AS au_hi,
    PERCENTILE_CONT(0.18) WITHIN GROUP (ORDER BY (current_saving_balance + current_deposit_balance)) AS au_med
  FROM churn.pred_result WHERE "prediction(label_churn)" = true
)
SELECT c.cif, COALESCE(d.customer_name, c.cif) AS cust_name,
       ROUND(("confidence(true)"*100)::numeric,0) AS churn_pct,
       (c.current_saving_balance + c.current_deposit_balance) AS bal
FROM churn.pred_result c
LEFT JOIN ods.demografi d ON c.cif = d.cust_no
LEFT JOIN (SELECT cust_no, MIN(cluster) AS cluster FROM segmentation.pred_result GROUP BY cust_no) seg ON seg.cust_no = c.cif, cut
WHERE c."prediction(label_churn)" = true
  AND (
    (((c.current_saving_balance + c.current_deposit_balance) >= cut.au_hi) AND (c."confidence(true)" >= cut.ch_hi))
    OR
    (((c.current_saving_balance + c.current_deposit_balance) >= cut.au_med AND (c.current_saving_balance + c.current_deposit_balance) < cut.au_hi) AND (c."confidence(true)" >= cut.ch_med AND c."confidence(true)" < cut.ch_hi))
  )
ORDER BY (c.current_saving_balance + c.current_deposit_balance) DESC
LIMIT 10 OFFSET 0;
