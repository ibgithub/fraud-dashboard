-- ============================================================
-- V10: Reorder menus so Segmentation appears above Churn
--   1. Main sidebar: Segmentation Analysis (CS) above Churn Analysis (CH)
--   2. Model Performance: Segmentation (ML-02) above Churn (ML-01)
-- ============================================================

-- 1. Main menu order: CS -> 2, CH -> 4
UPDATE auth.menu SET sort_order = 2 WHERE menu_key = 'menu_cs' OR code = 'CS';
UPDATE auth.menu SET sort_order = 4 WHERE menu_key = 'menu_ch' OR code = 'CH';

-- 2. Model Performance submenu order: Segmentation first, Churn second
UPDATE auth.menu SET sort_order = 1 WHERE menu_key = 'menu_ml_02' OR code = 'ML-02';
UPDATE auth.menu SET sort_order = 2 WHERE menu_key = 'menu_ml_01' OR code = 'ML-01';
