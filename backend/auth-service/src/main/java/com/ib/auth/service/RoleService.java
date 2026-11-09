package com.ib.auth.service;

import com.ib.auth.common.PageResult;
import com.ib.auth.dto.MenuDto;
import com.ib.auth.dto.RoleDto;
import com.ib.auth.repository.MenuRepository;
import com.ib.auth.repository.RoleRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class RoleService {

    private final RoleRepository roleRepository;
    private final MenuRepository menuRepository;
    private final AuditService auditService;

    public RoleService(RoleRepository roleRepository, MenuRepository menuRepository,
                       AuditService auditService) {
        this.roleRepository = roleRepository;
        this.menuRepository = menuRepository;
        this.auditService = auditService;
    }

    private String currentActor() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                return auth.getName();
            }
        } catch (Exception ignored) {
        }
        return "system";
    }

    /**
     * Normalize scope fields so they always satisfy the DB constraint:
     * - default to PUSAT when not provided
     * - PUSAT clears any branch_code
     * - CABANG requires a non-blank branch_code
     */
    private void normalizeScope(RoleDto role) {
        String scope = role.getScopeType();
        if (scope == null || scope.isBlank()) {
            scope = "PUSAT";
        }
        scope = scope.trim().toUpperCase();
        if (!scope.equals("PUSAT") && !scope.equals("CABANG")) {
            throw new RuntimeException("role.invalid_scope");
        }
        if (scope.equals("CABANG")) {
            String branch = role.getBranchCode();
            if (branch == null || branch.isBlank()) {
                throw new RuntimeException("role.branch_required");
            }
            role.setBranchCode(branch.trim());
        } else {
            role.setBranchCode(null);
        }
        role.setScopeType(scope);
    }

    // ==================== CRUD Role ====================

    public List<RoleDto> getAllRoles() {
        return roleRepository.findAll();
    }

    public PageResult<RoleDto> findPaged(int page, int size, String keyword) {
        int offset = page * size;
        List<RoleDto> roles = roleRepository.findAll(size, offset, keyword);
        int total = roleRepository.countAll(keyword);

        // Populate menus untuk setiap role
        for (RoleDto role : roles) {
            role.setMenus(menuRepository.findByRoleId(role.getId()));
        }

        return new PageResult<>(roles, page, size, total);
    }

    public RoleDto getRoleById(Long id) {
        RoleDto role = roleRepository.findById(id);
        if (role == null) {
            throw new RuntimeException("role.not_found");
        }
        role.setMenus(menuRepository.findByRoleId(id));
        return role;
    }

    public RoleDto createRole(RoleDto request, String createdBy) {
        if (roleRepository.findByRoleName(request.getRoleName()) != null) {
            throw new RuntimeException("role.already_exists");
        }
        normalizeScope(request);
        roleRepository.insert(request, createdBy);
        RoleDto created = roleRepository.findByRoleName(request.getRoleName());

        // Simpan menus kalau menuIds dikirim
        if (request.getMenuIds() != null && !request.getMenuIds().isEmpty()) {
            for (Long menuId : request.getMenuIds()) {
                menuRepository.insertRoleMenu(created.getId(), menuId, createdBy);
            }
        }
        created.setMenus(menuRepository.findByRoleId(created.getId()));

        auditService.record(createdBy, "ROLE_CREATE", "ROLE", String.valueOf(created.getId()),
                "Created role '" + created.getRoleName() + "'");
        return created;
    }

    public RoleDto updateRole(Long id, RoleDto request, String updatedBy) {
        RoleDto existing = roleRepository.findById(id);
        if (existing == null) {
            throw new RuntimeException("role.not_found");
        }
        RoleDto duplicate = roleRepository.findByRoleName(request.getRoleName());
        if (duplicate != null && !duplicate.getId().equals(id)) {
            throw new RuntimeException("role.already_exists");
        }
        request.setId(id);
        normalizeScope(request);
        roleRepository.update(request, updatedBy);

        // Update menus kalau menuIds dikirim
        if (request.getMenuIds() != null) {
            menuRepository.deleteRoleMenus(id);
            for (Long menuId : request.getMenuIds()) {
                menuRepository.insertRoleMenu(id, menuId, updatedBy);
            }
        }

        RoleDto updated = roleRepository.findById(id);
        updated.setMenus(menuRepository.findByRoleId(id));

        auditService.record(updatedBy, "ROLE_UPDATE", "ROLE", String.valueOf(id),
                "Updated role '" + updated.getRoleName() + "'");
        return updated;
    }

    public void deleteRole(Long id) {
        RoleDto existing = roleRepository.findById(id);
        if (existing == null) {
            throw new RuntimeException("role.not_found");
        }
        if (roleRepository.countUsersByRoleId(id) > 0) {
            throw new RuntimeException("role.still_in_use");
        }
        roleRepository.deleteById(id);

        auditService.record(currentActor(), "ROLE_DELETE", "ROLE", String.valueOf(id),
                "Deleted role '" + existing.getRoleName() + "'");
    }

    // ==================== Assign Menus ke Role ====================

    public List<MenuDto> setRoleMenus(Long roleId, List<Long> menuIds, String createdBy) {
        RoleDto role = roleRepository.findById(roleId);
        if (role == null) {
            throw new RuntimeException("role.not_found");
        }

        // Validasi menu_id ada di database
        for (Long menuId : menuIds) {
            if (menuRepository.findById(menuId) == null) {
                throw new RuntimeException("menu.not_found");
            }
        }

        // Replace strategy
        menuRepository.deleteRoleMenus(roleId);
        for (Long menuId : menuIds) {
            menuRepository.insertRoleMenu(roleId, menuId, createdBy);
        }

        auditService.record(createdBy, "ROLE_MENUS_UPDATE", "ROLE", String.valueOf(roleId),
                "Set " + menuIds.size() + " menu(s) for role '" + role.getRoleName() + "'");
        return menuRepository.findByRoleId(roleId);
    }

    // Get menus untuk role tertentu (flat list)
    public List<MenuDto> getRoleMenus(Long roleId) {
        return menuRepository.findByRoleId(roleId);
    }

    // ==================== Assign Roles ke User ====================

    public List<RoleDto> setUserRoles(Long userId, List<Long> roleIds, String createdBy) {
        for (Long roleId : roleIds) {
            if (roleRepository.findById(roleId) == null) {
                throw new RuntimeException("role.not_found");
            }
        }
        roleRepository.deleteUserRoles(userId);
        for (Long roleId : roleIds) {
            roleRepository.insertUserRole(userId, roleId, createdBy);
        }

        auditService.record(createdBy, "USER_ROLES_UPDATE", "USER", String.valueOf(userId),
                "Set " + roleIds.size() + " role(s) for user (id=" + userId + ")");
        return roleRepository.findRolesByUserId(userId);
    }

    // ==================== Get User Menus (untuk frontend) ====================

    /**
     * Ambil menu user (gabungan semua role, distinct).
     * Return dalam struktur tree: parent → children.
     */
    public List<MenuDto> getUserMenus(Long userId) {
        List<MenuDto> flatMenus = menuRepository.findByUserId(userId);
        return buildMenuTree(flatMenus);
    }

    public List<RoleDto> getUserRoles(Long userId) {
        return roleRepository.findRolesByUserId(userId);
    }

    // ==================== Get All Menus ====================

    public List<MenuDto> getAllMenus() {
        return menuRepository.findAll();
    }

    public PageResult<MenuDto> findMenusPaged(int page, int size, String keyword) {
        int offset = page * size;
        List<MenuDto> menus = menuRepository.findAll(size, offset, keyword);
        int total = menuRepository.countAll(keyword);
        return new PageResult<>(menus, page, size, total);
    }

    public MenuDto createMenu(MenuDto request) {
        if (menuRepository.findByCode(request.getCode()) != null) {
            throw new RuntimeException("menu.code_already_exists");
        }
        menuRepository.insert(request);
        MenuDto created = menuRepository.findByCode(request.getCode());
        auditService.record(currentActor(), "MENU_CREATE", "MENU",
                created != null ? String.valueOf(created.getId()) : null,
                "Created menu '" + request.getCode() + "'");
        return created;
    }

    public MenuDto updateMenu(Long id, MenuDto request) {
        MenuDto existing = menuRepository.findById(id);
        if (existing == null) {
            throw new RuntimeException("menu.not_found");
        }
        MenuDto duplicate = menuRepository.findByCode(request.getCode());
        if (duplicate != null && !duplicate.getId().equals(id)) {
            throw new RuntimeException("menu.code_already_exists");
        }
        request.setId(id);
        menuRepository.update(request);
        auditService.record(currentActor(), "MENU_UPDATE", "MENU", String.valueOf(id),
                "Updated menu '" + request.getCode() + "'");
        return menuRepository.findById(id);
    }

    public void deleteMenu(Long id) {
        MenuDto existing = menuRepository.findById(id);
        if (existing == null) {
            throw new RuntimeException("menu.not_found");
        }
        // Kalau parent menu, cek apakah masih punya children
        if (existing.getParentCode() == null && menuRepository.countByParentCode(existing.getCode()) > 0) {
            throw new RuntimeException("menu.has_children");
        }
        menuRepository.deleteById(id);
        auditService.record(currentActor(), "MENU_DELETE", "MENU", String.valueOf(id),
                "Deleted menu '" + existing.getCode() + "'");
    }

    public MenuDto getMenuById(Long id) {
        MenuDto menu = menuRepository.findById(id);
        if (menu == null) {
            throw new RuntimeException("menu.not_found");
        }
        return menu;
    }

    // ==================== Helper: Build Tree ====================

    private List<MenuDto> buildMenuTree(List<MenuDto> flatMenus) {
        // Pisahkan parent dan children
        Map<String, MenuDto> parentMap = new LinkedHashMap<>();
        List<MenuDto> children = new ArrayList<>();

        for (MenuDto menu : flatMenus) {
            if (menu.getParentCode() == null) {
                menu.setChildren(new ArrayList<>());
                parentMap.put(menu.getCode(), menu);
            } else {
                children.add(menu);
            }
        }

        // Masukkan children ke parent masing-masing
        for (MenuDto child : children) {
            MenuDto parent = parentMap.get(child.getParentCode());
            if (parent != null) {
                parent.getChildren().add(child);
            }
        }

        // Hanya return parent yang punya children (atau parent yang menu_id-nya sendiri di-assign)
        return new ArrayList<>(parentMap.values());
    }
}
