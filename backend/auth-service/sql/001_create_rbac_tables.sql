-- ============================================================
-- DDL: Role-Based Access Control (RBAC) Tables
-- Jalankan di database PostgreSQL
-- ============================================================

-- 1. Tabel roles
CREATE TABLE auth.roles (
    id serial4 NOT NULL,
    role_name varchar(50) NOT NULL,
    description varchar(255) NULL,
    created_by varchar(20) NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_by varchar(20) NULL,
    updated_at timestamp NULL,
    CONSTRAINT roles_pkey PRIMARY KEY (id),
    CONSTRAINT roles_role_name_key UNIQUE (role_name)
);

-- 2. Tabel permissions
CREATE TABLE auth.permissions (
    id serial4 NOT NULL,
    permission_name varchar(100) NOT NULL,
    description varchar(255) NULL,
    created_by varchar(20) NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_by varchar(20) NULL,
    updated_at timestamp NULL,
    CONSTRAINT permissions_pkey PRIMARY KEY (id),
    CONSTRAINT permissions_permission_name_key UNIQUE (permission_name)
);

-- 3. Junction table: user <-> role (many-to-many)
CREATE TABLE auth.user_roles (
    user_id int4 NOT NULL,
    role_id int4 NOT NULL,
    created_by varchar(20) NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id),
    CONSTRAINT user_roles_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT user_roles_role_fk FOREIGN KEY (role_id) REFERENCES auth.roles(id) ON DELETE CASCADE
);

-- 4. Junction table: role <-> permission (many-to-many)
CREATE TABLE auth.role_permissions (
    role_id int4 NOT NULL,
    permission_id int4 NOT NULL,
    created_by varchar(20) NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
    CONSTRAINT role_permissions_role_fk FOREIGN KEY (role_id) REFERENCES auth.roles(id) ON DELETE CASCADE,
    CONSTRAINT role_permissions_permission_fk FOREIGN KEY (permission_id) REFERENCES auth.permissions(id) ON DELETE CASCADE
);
