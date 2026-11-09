-- ============================================================
-- V27: Rename tier distribution setting parameters to uppercase,
--   canonical names:
--     aum_tier_distribution   -> TRB_TIER_DISTRIBUTION
--     churn_tier_distribution -> CHURN_TIER_DISTRIBUTION
--   Also refresh the descriptions (AUM -> TRB wording).
-- ============================================================

UPDATE auth.setting_parameters
SET name = 'TRB_TIER_DISTRIBUTION',
    description = 'Distribusi persen tier TRB Hi|Med|Lo'
WHERE name = 'aum_tier_distribution';

UPDATE auth.setting_parameters
SET name = 'CHURN_TIER_DISTRIBUTION',
    description = 'Distribusi persen tier churn Hi|Med|Lo'
WHERE name = 'churn_tier_distribution';
