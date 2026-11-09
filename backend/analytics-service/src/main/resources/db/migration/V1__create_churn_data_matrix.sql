-- Materialisasi klasifikasi Churn × AUM per nasabah churn.
-- churn_category  : hi / med / lo  (dari confidence(true) + persen setting)
-- aum_category    : hi / med / lo  (dari churn.aum + persen setting AUM)
-- matrix_classification: aum_category + '_' + churn_category  (mis. hi_hi, lo_med)

CREATE TABLE IF NOT EXISTS churn.churn_data_matrix (
    id                    SERIAL PRIMARY KEY,
    cif                   VARCHAR(50)  NOT NULL,
    churn_category        VARCHAR(10)  NULL,   -- hi / med / lo; NULL = belum diset
    aum_category          VARCHAR(10)  NULL,   -- hi / med / lo; NULL = belum diset
    matrix_classification VARCHAR(10)  NULL,   -- aum_churn, mis. hi_hi; NULL = belum lengkap
    created_ts            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_ts            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_churn_data_matrix_cif ON churn.churn_data_matrix (cif);
CREATE INDEX        IF NOT EXISTS  idx_churn_data_matrix_cat  ON churn.churn_data_matrix (churn_category, aum_category);
CREATE INDEX        IF NOT EXISTS  idx_churn_data_matrix_mx   ON churn.churn_data_matrix (matrix_classification);
