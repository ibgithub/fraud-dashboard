-- Kolom is_selected: menandai nasabah yang cluster-nya dipilih di halaman Matriks.
-- Hot Target membaca nasabah dengan is_selected = true.
ALTER TABLE churn.churn_data_matrix
    ADD COLUMN IF NOT EXISTS is_selected BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_churn_data_matrix_selected ON churn.churn_data_matrix (is_selected);
