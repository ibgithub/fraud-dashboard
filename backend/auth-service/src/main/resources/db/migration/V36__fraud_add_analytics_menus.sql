-- ============================================================
-- V36: Fraud Dashboard — "Analytics & Insights" menus (FraudGuard pages,
--      currently mockups with hardcoded data):
--        FG-OV    Ringkasan / Overview
--        FG-LIVE  Pemantauan Live / Live Monitoring
--        FG-EXEC  Ringkasan Eksekutif / Executive Summary
--      Top-level menus placed right after HOME (sort_order 1); granted to every role.
--      The sidebar group is decided in the frontend (DashboardLayout MENU_GROUPS).
-- ============================================================

INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(92, 'FG-OV',   NULL, 'menu_fg_ov',   '/fraud/overview',  'LayoutDashboard', 2),
(93, 'FG-LIVE', NULL, 'menu_fg_live', '/fraud/live',      'Radio',           3),
(94, 'FG-EXEC', NULL, 'menu_fg_exec', '/fraud/executive', 'Briefcase',       4)
ON CONFLICT (id) DO NOTHING;

SELECT setval('auth.menu_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 1), 94) FROM auth.menu));

INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, m.id, 'system'
FROM auth.roles r
CROSS JOIN auth.menu m
WHERE m.code IN ('FG-OV', 'FG-LIVE', 'FG-EXEC')
  AND NOT EXISTS (SELECT 1 FROM auth.role_menus rm WHERE rm.role_id = r.id AND rm.menu_id = m.id);
