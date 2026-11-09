-- ============================================================
-- V34: Ensure the "Recommender System" (RS) menu exists, is assigned
--      to every role, and sits directly below "TRB Analysis" (AUM)
--      in the sidebar.
--
--   Context:
--     - AUM (TRB Analysis) is a top-level menu with sort_order = 5.
--     - RS was seeded in V3 and shifted to sort_order 7 by V17, which
--       left CPI (sort_order 6) sitting between AUM and RS. CPI lives in
--       a different sidebar group, but to make the DB order explicit we
--       place RS immediately after AUM here.
--
--   This migration is idempotent: it re-asserts the RS parent + its two
--   sub-menus, re-grants role access, and re-numbers the top-level menus
--   so RS = AUM.sort_order + 1 with everything after it shifted down.
-- ============================================================

-- 1. Re-assert the RS parent menu and its sub-menus (upsert by id).
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
( 6, 'RS',    NULL, 'menu_rs',    '/recommender',                   'ShoppingBag', 6),
(25, 'RS-01', 'RS', 'menu_rs_01', '/recommender/recommendations',   NULL,         1),
(26, 'RS-02', 'RS', 'menu_rs_02', '/recommender/model-performance', NULL,         2)
ON CONFLICT (id) DO UPDATE SET
    code        = EXCLUDED.code,
    parent_code = EXCLUDED.parent_code,
    menu_key    = EXCLUDED.menu_key,
    path        = EXCLUDED.path,
    icon        = EXCLUDED.icon;

-- 2. Re-number top-level menus so RS sits directly after AUM.
--    a) Push every top-level menu that is at or after AUM's slot down by one,
--       leaving a gap right after AUM (skip AUM and RS themselves).
UPDATE auth.menu
SET sort_order = sort_order + 1
WHERE parent_code IS NULL
  AND code NOT IN ('AUM', 'RS')
  AND sort_order > (SELECT sort_order FROM auth.menu WHERE code = 'AUM');

--    b) Place RS into the freshly opened slot (AUM + 1).
UPDATE auth.menu
SET sort_order = (SELECT sort_order FROM auth.menu WHERE code = 'AUM') + 1
WHERE code = 'RS';

-- 3. Make sure RS + sub-menus are assigned to every role.
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, m.id, 'system'
FROM auth.roles r
CROSS JOIN (SELECT id FROM auth.menu WHERE code IN ('RS', 'RS-01', 'RS-02')) AS m
WHERE NOT EXISTS (
    SELECT 1 FROM auth.role_menus rm
    WHERE rm.role_id = r.id AND rm.menu_id = m.id
);
