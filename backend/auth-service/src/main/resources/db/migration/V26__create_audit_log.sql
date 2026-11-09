-- ============================================================
-- V26: Application audit trail.
--   auth.audit_log records key security/management actions:
--   login (success/failed), user create/update/delete, password
--   reset, block/unlock, role changes, menu & setting changes.
--   Also adds an "Audit Log" menu under Access Management (ADM).
-- ============================================================

CREATE TABLE IF NOT EXISTS auth.audit_log (
    id          bigserial PRIMARY KEY,
    actor       varchar(50),          -- username performing the action ('anonymous' for failed login)
    action      varchar(50)  NOT NULL,-- LOGIN, LOGIN_FAILED, USER_CREATE, PASSWORD_RESET, ...
    entity_type varchar(30),          -- USER, ROLE, MENU, SETTING, AUTH
    entity_id   varchar(50),          -- id of the affected record (nullable)
    detail      varchar(500),         -- short human-readable summary
    ip_address  varchar(64),          -- caller IP (nullable)
    created_at  timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON auth.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor      ON auth.audit_log (actor);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON auth.audit_log (action);

-- Menu: Audit Log under Access Management (ADM), sort_order 5.
INSERT INTO auth.menu (id, code, parent_code, menu_key, path, icon, sort_order) VALUES
(79, 'ADM-05', 'ADM', 'menu_adm_05', '/admin/audit-log', NULL, 5)
ON CONFLICT (id) DO NOTHING;

-- Assign to all roles that already have the ADM parent (id 78).
INSERT INTO auth.role_menus (role_id, menu_id, created_by)
SELECT rm.role_id, 79, 'system'
FROM auth.role_menus rm
WHERE rm.menu_id = 78
  AND NOT EXISTS (
      SELECT 1 FROM auth.role_menus x
      WHERE x.role_id = rm.role_id AND x.menu_id = 79
  );
