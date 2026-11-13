-- ============================================================
-- V37: Fraud Dashboard — "Action & Retention" menus (FraudGuard pages,
--      currently mockups with hardcoded data):
--        FG-ALERT   Antrian Alert / Alert Queue
--        FG-DAILY   Daily Review / Daily Review
--        FG-REVIEW  Review Analis / Analyst Review
--      Top-level menus after the Analytics ones (sort_order 5-7); granted to every role.
--      The sidebar group is decided in the frontend (DashboardLayout MENU_GROUPS).
-- ============================================================

INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(95, 'FG-ALERT',  NULL, 'menu_fg_alert',  '/fraud/alerts',       'ListChecks',     5),
(96, 'FG-DAILY',  NULL, 'menu_fg_daily',  '/fraud/daily-review', 'Sunrise',        6),
(97, 'FG-REVIEW', NULL, 'menu_fg_review', '/fraud/review',       'ClipboardCheck', 7)
ON CONFLICT (id) DO NOTHING;

SELECT setval('auth.menu_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 1), 97) FROM auth.menu));

INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, m.id, 'system'
FROM auth.roles r
CROSS JOIN auth.menu m
WHERE m.code IN ('FG-ALERT', 'FG-DAILY', 'FG-REVIEW')
  AND NOT EXISTS (SELECT 1 FROM auth.role_menus rm WHERE rm.role_id = r.id AND rm.menu_id = m.id);
