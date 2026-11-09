-- ============================================================
-- V34: Grant the Recommender System menu to the ADMIN role.
--
-- RS (/recommender) and RS-01 (/recommender/recommendations) already
-- exist in auth.menu and are assigned to ROLE_PUSAT / ROLE_CABANG, but
-- were never granted to ADMIN, so the admin sidebar did not show them.
-- This grants both to every role that doesn't already have them (which
-- effectively adds ADMIN). Idempotent.
-- ============================================================

INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT r.id, m.id, 'system'
FROM auth.roles r
CROSS JOIN auth.menu m
WHERE m.code IN ('RS', 'RS-01')
  AND NOT EXISTS (
    SELECT 1 FROM auth.role_menus rm
    WHERE rm.role_id = r.id AND rm.menu_id = m.id
  );
