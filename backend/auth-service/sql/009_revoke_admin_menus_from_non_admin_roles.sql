-- ============================================================
-- 009: Revoke ADMIN-only menus from non-ADMIN roles
-- ------------------------------------------------------------
-- Context:
--   auth-service SecurityConfig restricts these APIs to ROLE_ADMIN:
--     /api/roles/**      (SET-08 Role Management,  /setup/role-management)
--     /api/menus/**      (SET-09 Menu Management,  /setup/menu-management)
--     /api/settings/**   (SET-10 Setting Params,   /setup/setting-parameters)
--     /api/audit-logs/** (ADM-05 Audit Log,        /admin/audit-log)
--     /api/users (mgmt)  (SET-04 User Management,   /setup/user-role-management)
--
--   The ADM parent (/admin) only groups the above admin pages, so non-admin
--   roles must not see it either.
--
--   Previously roles CABANG and PUSAT had these menus assigned in
--   auth.role_menus, so /api/users/me/menus returned them and the sidebar
--   showed e.g. "Manajemen Role" — which then 403'd when opened.
--
-- This migration removes those assignments from every role that is NOT ADMIN.
-- ADMIN keeps full access. Idempotent and safe to re-run.
-- ============================================================

DELETE FROM auth.role_menus rm
USING auth.roles r, auth.menu m
WHERE rm.role_id = r.id
  AND rm.menu_id = m.id
  AND r.role_name <> 'ADMIN'
  AND m.code IN ('ADM', 'ADM-05', 'SET-04', 'SET-08', 'SET-09', 'SET-10');

-- ------------------------------------------------------------
-- Verification (uncomment to inspect):
-- SELECT r.role_name, m.code, m.path
-- FROM auth.role_menus rm
-- JOIN auth.roles r ON r.id = rm.role_id
-- JOIN auth.menu  m ON m.id = rm.menu_id
-- WHERE m.code IN ('ADM','ADM-05','SET-04','SET-08','SET-09','SET-10')
-- ORDER BY r.role_name, m.code;
-- Expected: only ADMIN rows remain.
-- ============================================================
