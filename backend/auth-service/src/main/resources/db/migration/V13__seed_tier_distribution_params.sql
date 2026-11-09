-- ============================================================
-- V13: Seed tier distribution parameters (percentage-based).
--   Format: "Hi|Med|Lo" percent, pipe-separated. Sum should be 100.
--   Tier counts = pct * total churned customers (prediction=true).
-- ============================================================

INSERT INTO auth.setting_parameters (name, value, description, created_by) VALUES
  ('churn_tier_distribution', '33|33|34', 'Distribusi persen tier churn Hi|Med|Lo (dikali jumlah nasabah churn)', 'system'),
  ('aum_tier_distribution',   '33|33|34', 'Distribusi persen tier AUM Hi|Med|Lo (dikali jumlah nasabah churn)',   'system')
ON CONFLICT (name) DO NOTHING;
