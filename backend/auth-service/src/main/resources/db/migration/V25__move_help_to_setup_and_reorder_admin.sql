-- ============================================================
-- V25:
--   1. Move "Help & Glossary" (SYS-02, /system/help-glossary)
--      from the System group (SYS) into Setup (SET), placed last.
--   2. Fix top-level ordering so Setup (SET) appears ABOVE
--      Access Management (ADM). The ADM parent was created with
--      sort_order 10.5, which truncates to 10 in the int-typed
--      DTO and ties with SET (10). Use clean integers:
--        SET = 10, ADM = 11, SYS = 12.
-- ============================================================

-- 1. Move Help & Glossary into Setup (SET), last position (sort_order 12).
UPDATE auth.menu
SET parent_code = 'SET', sort_order = 12
WHERE code = 'SYS-02';

-- 2. Re-number top-level menus to remove the fractional tie.
UPDATE auth.menu SET sort_order = 10 WHERE code = 'SET';
UPDATE auth.menu SET sort_order = 11 WHERE code = 'ADM';
UPDATE auth.menu SET sort_order = 12 WHERE code = 'SYS';
