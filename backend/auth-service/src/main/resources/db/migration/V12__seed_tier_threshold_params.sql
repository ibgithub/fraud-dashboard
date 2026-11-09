-- ============================================================
-- V12: Seed churn & AUM tier threshold parameters into setting_parameters
--   Churn thresholds are on the confidence(true) score scale (0..1),
--   stored here as 0..100 percent for readability.
--   AUM thresholds are in rupiah (from churn.aum p33 / p66).
-- ============================================================

INSERT INTO auth.setting_parameters (name, value, description, created_by) VALUES
  ('CHURN_THRESHOLD_LOW_MED',  '30',        'Ambang skor churn (0-100) batas Rendah -> Sedang', 'system'),
  ('CHURN_THRESHOLD_MED_HIGH', '70',        'Ambang skor churn (0-100) batas Sedang -> Tinggi', 'system'),
  ('AUM_THRESHOLD_LOW_MED',    '333095356', 'Ambang AUM (rupiah) batas Rendah -> Sedang',        'system'),
  ('AUM_THRESHOLD_MED_HIGH',   '665519052', 'Ambang AUM (rupiah) batas Sedang -> Tinggi',        'system')
ON CONFLICT (name) DO NOTHING;
