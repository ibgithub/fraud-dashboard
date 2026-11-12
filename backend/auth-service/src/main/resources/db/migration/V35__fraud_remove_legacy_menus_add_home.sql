-- ============================================================
-- V35: Fraud Dashboard — remove the legacy anvaia-bag / CPI menus
--      and add a "Home" landing menu.
--
--   Kept (generic):
--     ADM  Access Management: user, role, menu, setting parameter, audit log
--     SYS  Profile & Account: profile, change password (shown in the top-right dropdown)
--   Removed (legacy CPI analytics): CI, CS, CH, AUM, CPI, RS, CAM, C360, NOT, ML, SET
--     (SET only holds legacy settings + the CPI help glossary since V24/V25).
--
--   auth.role_menus rows go away via ON DELETE CASCADE.
--   The legacy page routes still exist in the frontend but are no longer
--   in any menu; they are removed when the fraud pages replace them.
-- ============================================================

-- 1. Children first (by parent), then the parents themselves.
DELETE FROM auth.menu
WHERE parent_code IN ('CI', 'CS', 'CH', 'AUM', 'CPI', 'RS', 'CAM', 'C360', 'NOT', 'ML', 'SET',
                      'CP', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8');

DELETE FROM auth.menu
WHERE code IN ('CI', 'CS', 'CH', 'AUM', 'CPI', 'RS', 'CAM', 'C360', 'NOT', 'ML', 'SET',
               'CP', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8');

-- 2. Home landing page (first fraud menu). New ids start at 91.
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(91, 'HOME', NULL, 'menu_home', '/home', 'LayoutDashboard', 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval('auth.menu_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 1), 91) FROM auth.menu));

-- 3. Every role can open Home.
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, m.id, 'system'
FROM auth.roles r
CROSS JOIN auth.menu m
WHERE m.code = 'HOME'
  AND NOT EXISTS (SELECT 1 FROM auth.role_menus rm WHERE rm.role_id = r.id AND rm.menu_id = m.id);
