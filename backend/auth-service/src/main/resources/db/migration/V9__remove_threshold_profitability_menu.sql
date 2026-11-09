-- ============================================================
-- V9: Remove Setup > Threshold Tiering Profitability menu
-- Bank has no profitability module, so the profitability
-- threshold setup page (SET-02 / menu_set_02) is removed.
-- ============================================================

DELETE FROM auth.role_menus
WHERE menu_id IN (
    SELECT id FROM auth.menu
    WHERE menu_key = 'menu_set_02'
       OR code = 'SET-02'
       OR path = '/setup/threshold-profitability'
);

DELETE FROM auth.menu
WHERE menu_key = 'menu_set_02'
   OR code = 'SET-02'
   OR path = '/setup/threshold-profitability';
