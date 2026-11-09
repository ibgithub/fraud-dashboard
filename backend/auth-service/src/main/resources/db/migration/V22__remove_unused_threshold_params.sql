-- ============================================================
-- V22: Remove unused absolute-threshold parameters.
--   Tier classification (churn Lo/Med/Hi and AUM Lo/Med/Hi) is
--   driven by percentage distributions instead:
--     - churn_tier_distribution
--     - aum_tier_distribution
--   The following absolute thresholds are no longer referenced
--   anywhere in the codebase and are removed.
-- ============================================================

DELETE FROM auth.setting_parameters
WHERE name IN (
    'AUM_THRESHOLD_LOW_MED',
    'AUM_THRESHOLD_MED_HIGH',
    'CHURN_THRESHOLD_LOW_MED',
    'CHURN_THRESHOLD_MED_HIGH'
);
