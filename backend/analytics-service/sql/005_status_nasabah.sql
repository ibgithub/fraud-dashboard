-- =============================================================================
-- ods.status_nasabah
-- Per-customer status with Dormant tier + mobile-banking activity status.
-- Source: "Status Nasabah v2(in).csv" (columns: cif, status, mb_status).
--   status    : Active | Inactive | Dormant
--   mb_status : Active | Inactive | NULL  (CSV literal "Null" -> SQL NULL)
-- cif joins to ods.mv_h.customer_id / ods.trb_score.cif.
--
-- NOTE: this is a TABLE named ods.status_nasabah; distinct from the
-- status_nasabah COLUMN inside ods.mv_h.
-- =============================================================================

DROP TABLE IF EXISTS ods.status_nasabah;
CREATE TABLE ods.status_nasabah (
  cif       bigint PRIMARY KEY,
  status    text,
  mb_status text
);

-- Load raw CSV (mb_status comes in as the literal string 'Null').
\copy ods.status_nasabah (cif, status, mb_status) FROM '/tmp/status_nasabah_v2.csv' WITH (FORMAT csv, HEADER true)

-- Normalise the literal 'Null' string to real NULL.
UPDATE ods.status_nasabah
SET mb_status = NULL
WHERE mb_status IS NOT NULL AND lower(btrim(mb_status)) = 'null';

CREATE INDEX IF NOT EXISTS idx_status_nasabah_status    ON ods.status_nasabah (status);
CREATE INDEX IF NOT EXISTS idx_status_nasabah_mb_status ON ods.status_nasabah (mb_status);

ANALYZE ods.status_nasabah;

-- Sanity output.
SELECT status, COUNT(*) FROM ods.status_nasabah GROUP BY status ORDER BY 2 DESC;
SELECT COALESCE(mb_status,'<null>') AS mb_status, COUNT(*)
FROM ods.status_nasabah GROUP BY mb_status ORDER BY 2 DESC;
SELECT COUNT(*) AS total_rows FROM ods.status_nasabah;
