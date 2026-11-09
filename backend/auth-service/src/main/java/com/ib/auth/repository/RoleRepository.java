package com.ib.auth.repository;

import com.ib.auth.dto.RoleDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class RoleRepository {

    private final JdbcTemplate jdbcTemplate;

    public RoleRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<RoleDto> roleMapper = (rs, rowNum) -> {
        RoleDto r = new RoleDto();
        r.setId(rs.getLong("id"));
        r.setRoleName(rs.getString("role_name"));
        r.setDescription(rs.getString("description"));
        r.setCanViewCustomerName(rs.getBoolean("can_view_customer_name"));
        r.setScopeType(rs.getString("scope_type"));
        r.setBranchCode(rs.getString("branch_code"));
        return r;
    };

    // ==================== CRUD Role ====================

    public List<RoleDto> findAll() {
        return jdbcTemplate.query(
                "SELECT id, role_name, description, can_view_customer_name, scope_type, branch_code FROM auth.roles ORDER BY role_name",
                roleMapper
        );
    }

    public List<RoleDto> findAll(int limit, int offset, String keyword) {
        if (keyword != null && !keyword.isEmpty()) {
            keyword = keyword.toUpperCase();
            String sql = "SELECT id, role_name, description, can_view_customer_name, scope_type, branch_code FROM auth.roles " +
                    "WHERE upper(role_name) LIKE CONCAT('%', ?, '%') " +
                    "OR upper(description) LIKE CONCAT('%', ?, '%') " +
                    "ORDER BY role_name LIMIT ? OFFSET ?";
            return jdbcTemplate.query(sql, roleMapper, keyword, keyword, limit, offset);
        }
        return jdbcTemplate.query(
                "SELECT id, role_name, description, can_view_customer_name, scope_type, branch_code FROM auth.roles ORDER BY role_name LIMIT ? OFFSET ?",
                roleMapper, limit, offset
        );
    }

    public int countAll(String keyword) {
        if (keyword != null && !keyword.isEmpty()) {
            keyword = keyword.toUpperCase();
            String sql = "SELECT count(1) FROM auth.roles " +
                    "WHERE upper(role_name) LIKE CONCAT('%', ?, '%') " +
                    "OR upper(description) LIKE CONCAT('%', ?, '%')";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, keyword, keyword);
            return count != null ? count : 0;
        }
        Integer count = jdbcTemplate.queryForObject("SELECT count(1) FROM auth.roles", Integer.class);
        return count != null ? count : 0;
    }

    public RoleDto findById(Long id) {
        List<RoleDto> roles = jdbcTemplate.query(
                "SELECT id, role_name, description, can_view_customer_name, scope_type, branch_code FROM auth.roles WHERE id = ?",
                roleMapper, id
        );
        return roles.isEmpty() ? null : roles.get(0);
    }

    public RoleDto findByRoleName(String roleName) {
        List<RoleDto> roles = jdbcTemplate.query(
                "SELECT id, role_name, description, can_view_customer_name, scope_type, branch_code FROM auth.roles WHERE upper(role_name) = upper(?)",
                roleMapper, roleName
        );
        return roles.isEmpty() ? null : roles.get(0);
    }

    public int insert(RoleDto role, String createdBy) {
        return jdbcTemplate.update(
                "INSERT INTO auth.roles (role_name, description, can_view_customer_name, scope_type, branch_code, created_by) VALUES (?, ?, ?, ?, ?, ?)",
                role.getRoleName(), role.getDescription(), role.isCanViewCustomerName(),
                role.getScopeType(), role.getBranchCode(), createdBy
        );
    }

    public int update(RoleDto role, String updatedBy) {
        return jdbcTemplate.update(
                "UPDATE auth.roles SET role_name = ?, description = ?, can_view_customer_name = ?, scope_type = ?, branch_code = ?, updated_by = ?, updated_at = now() WHERE id = ?",
                role.getRoleName(), role.getDescription(), role.isCanViewCustomerName(),
                role.getScopeType(), role.getBranchCode(), updatedBy, role.getId()
        );
    }

    public int deleteById(Long id) {
        return jdbcTemplate.update("DELETE FROM auth.roles WHERE id = ?", id);
    }

    // ==================== User Roles ====================

    public List<RoleDto> findRolesByUserId(Long userId) {
        return jdbcTemplate.query(
                "SELECT r.id, r.role_name, r.description, r.can_view_customer_name, r.scope_type, r.branch_code " +
                        "FROM auth.roles r " +
                        "JOIN auth.user_roles ur ON ur.role_id = r.id " +
                        "WHERE ur.user_id = ? " +
                        "ORDER BY r.role_name",
                roleMapper, userId
        );
    }

    public void deleteUserRoles(Long userId) {
        jdbcTemplate.update("DELETE FROM auth.user_roles WHERE user_id = ?", userId);
    }

    public void insertUserRole(Long userId, Long roleId, String createdBy) {
        jdbcTemplate.update(
                "INSERT INTO auth.user_roles (user_id, role_id, created_by) VALUES (?, ?, ?)",
                userId, roleId, createdBy
        );
    }

    public int countUsersByRoleId(Long roleId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(1) FROM auth.user_roles WHERE role_id = ?",
                Integer.class, roleId
        );
        return count != null ? count : 0;
    }
}
