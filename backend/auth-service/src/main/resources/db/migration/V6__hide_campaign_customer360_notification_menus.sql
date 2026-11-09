-- ============================================================
-- V6: Remove/Hide Kampanye & Strategi (CAM), Customer 360 (C360),
-- and Pusat Notifikasi (NOT) menus and their submenus
-- ============================================================

-- 1. Delete role_menus associations for CAM, C360, and NOT
DELETE FROM auth.role_menus 
WHERE menu_id IN (
    SELECT id FROM auth.menu 
    WHERE code LIKE 'CAM%' 
       OR code LIKE 'C360%' 
       OR code LIKE 'NOT%' 
       OR menu_key LIKE 'menu_cam%' 
       OR menu_key LIKE 'menu_c360%' 
       OR menu_key LIKE 'menu_not%' 
       OR path LIKE '/campaign%' 
       OR path LIKE '/customer-360%' 
       OR path LIKE '/alerts%'
);

-- 2. Delete menus from auth.menu table
DELETE FROM auth.menu 
WHERE code LIKE 'CAM%' 
   OR code LIKE 'C360%' 
   OR code LIKE 'NOT%' 
   OR menu_key LIKE 'menu_cam%' 
   OR menu_key LIKE 'menu_c360%' 
   OR menu_key LIKE 'menu_not%' 
   OR path LIKE '/campaign%' 
   OR path LIKE '/customer-360%' 
   OR path LIKE '/alerts%';
