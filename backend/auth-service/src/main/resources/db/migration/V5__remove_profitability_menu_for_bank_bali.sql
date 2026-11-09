-- ============================================================
-- V5: Remove Profitability Analysis menu (CP / M4) for Bank Bali
-- ============================================================

DELETE FROM auth.role_menus 
WHERE menu_id IN (
    SELECT id FROM auth.menu 
    WHERE code LIKE 'CP%' 
       OR code LIKE 'M4%' 
       OR menu_key = 'menu_cp' 
       OR menu_key = 'menu_m4' 
       OR path LIKE '/profitability%'
);

DELETE FROM auth.menu 
WHERE code LIKE 'CP%' 
   OR code LIKE 'M4%' 
   OR menu_key = 'menu_cp' 
   OR menu_key = 'menu_m4' 
   OR path LIKE '/profitability%';
