package com.ib.auth.repository;

import com.ib.auth.dto.MenuDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class MenuRepository {

    private final JdbcTemplate jdbcTemplate;

    public MenuRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<MenuDto> menuMapper = (rs, rowNum) -> {
        MenuDto m = new MenuDto();
        m.setId(rs.getLong("id"));
        m.setCode(rs.getString("code"));
        m.setParentCode(rs.getString("parent_code"));
        m.setMenuKey(rs.getString("menu_key"));
        m.setPath(rs.getString("path"));
        m.setIcon(rs.getString("icon"));
        m.setSortOrder(rs.getInt("sort_order"));
        return m;
    };

    // Semua menu tanpa paging (untuk checklist di role management)
    public List<MenuDto> findAll() {
        return jdbcTemplate.query(
                "SELECT id, code, parent_code, menu_key, path, icon, sort_order " +
                        "FROM auth.menu ORDER BY sort_order, code",
                menuMapper
        );
    }

    // Menu dengan paging + keyword search (untuk halaman menu management)
    // Sort: parent dulu, diikuti children-nya (M1, M1.1, M1.2, ..., M2, M2.1, ...)
    private static final String MENU_ORDER = "ORDER BY COALESCE(parent_code, code), CASE WHEN parent_code IS NULL THEN 0 ELSE 1 END, sort_order";

    public List<MenuDto> findAll(int limit, int offset, String keyword) {
        if (keyword != null && !keyword.isEmpty()) {
            keyword = keyword.toUpperCase();
            String sql = "SELECT id, code, parent_code, menu_key, path, icon, sort_order " +
                    "FROM auth.menu " +
                    "WHERE upper(code) LIKE CONCAT('%', ?, '%') " +
                    "OR upper(menu_key) LIKE CONCAT('%', ?, '%') " +
                    "OR upper(path) LIKE CONCAT('%', ?, '%') " +
                    MENU_ORDER + " LIMIT ? OFFSET ?";
            return jdbcTemplate.query(sql, menuMapper, keyword, keyword, keyword, limit, offset);
        }
        return jdbcTemplate.query(
                "SELECT id, code, parent_code, menu_key, path, icon, sort_order FROM auth.menu " +
                        MENU_ORDER + " LIMIT ? OFFSET ?",
                menuMapper, limit, offset
        );
    }

    public int countAll(String keyword) {
        if (keyword != null && !keyword.isEmpty()) {
            keyword = keyword.toUpperCase();
            String sql = "SELECT count(1) FROM auth.menu " +
                    "WHERE upper(code) LIKE CONCAT('%', ?, '%') " +
                    "OR upper(menu_key) LIKE CONCAT('%', ?, '%') " +
                    "OR upper(path) LIKE CONCAT('%', ?, '%')";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, keyword, keyword, keyword);
            return count != null ? count : 0;
        }
        Integer count = jdbcTemplate.queryForObject("SELECT count(1) FROM auth.menu", Integer.class);
        return count != null ? count : 0;
    }

    // Menu yang dimiliki role tertentu
    public List<MenuDto> findByRoleId(Long roleId) {
        return jdbcTemplate.query(
                "SELECT m.id, m.code, m.parent_code, m.menu_key, m.path, m.icon, m.sort_order " +
                        "FROM auth.menu m " +
                        "JOIN auth.role_menus rm ON rm.menu_id = m.id " +
                        "WHERE rm.role_id = ? " +
                        "ORDER BY m.sort_order, m.code",
                menuMapper, roleId
        );
    }

    // Menu yang dimiliki user (gabungan semua role, distinct)
    public List<MenuDto> findByUserId(Long userId) {
        return jdbcTemplate.query(
                "SELECT DISTINCT m.id, m.code, m.parent_code, m.menu_key, m.path, m.icon, m.sort_order " +
                        "FROM auth.menu m " +
                        "JOIN auth.role_menus rm ON rm.menu_id = m.id " +
                        "JOIN auth.user_roles ur ON ur.role_id = rm.role_id " +
                        "WHERE ur.user_id = ? " +
                        "ORDER BY m.sort_order, m.code",
                menuMapper, userId
        );
    }

    // Set menus untuk role (replace strategy)
    public void deleteRoleMenus(Long roleId) {
        jdbcTemplate.update("DELETE FROM auth.role_menus WHERE role_id = ?", roleId);
    }

    public void insertRoleMenu(Long roleId, Long menuId, String createdBy) {
        jdbcTemplate.update(
                "INSERT INTO auth.role_menus (role_id, menu_id, created_by) VALUES (?, ?, ?)",
                roleId, menuId, createdBy
        );
    }

    public MenuDto findById(Long id) {
        List<MenuDto> list = jdbcTemplate.query(
                "SELECT id, code, parent_code, menu_key, path, icon, sort_order " +
                        "FROM auth.menu WHERE id = ?",
                menuMapper, id
        );
        return list.isEmpty() ? null : list.get(0);
    }

    public MenuDto findByCode(String code) {
        List<MenuDto> list = jdbcTemplate.query(
                "SELECT id, code, parent_code, menu_key, path, icon, sort_order " +
                        "FROM auth.menu WHERE code = ?",
                menuMapper, code
        );
        return list.isEmpty() ? null : list.get(0);
    }

    public int insert(MenuDto menu) {
        return jdbcTemplate.update(
                "INSERT INTO auth.menu (code, parent_code, menu_key, path, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                menu.getCode(), menu.getParentCode(), menu.getMenuKey(), menu.getPath(), menu.getIcon(), menu.getSortOrder()
        );
    }

    public int update(MenuDto menu) {
        return jdbcTemplate.update(
                "UPDATE auth.menu SET code = ?, parent_code = ?, menu_key = ?, path = ?, icon = ?, sort_order = ? WHERE id = ?",
                menu.getCode(), menu.getParentCode(), menu.getMenuKey(), menu.getPath(), menu.getIcon(), menu.getSortOrder(), menu.getId()
        );
    }

    public int deleteById(Long id) {
        return jdbcTemplate.update("DELETE FROM auth.menu WHERE id = ?", id);
    }

    public int countByParentCode(String parentCode) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(1) FROM auth.menu WHERE parent_code = ?",
                Integer.class, parentCode
        );
        return count != null ? count : 0;
    }
}
