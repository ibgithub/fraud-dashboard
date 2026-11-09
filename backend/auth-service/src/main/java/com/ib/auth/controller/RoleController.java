package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.common.PageResult;
import com.ib.auth.dto.MenuDto;
import com.ib.auth.dto.RoleDto;
import com.ib.auth.security.JwtUser;
import com.ib.auth.service.RoleService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResult<RoleDto>>> getAllRoles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword) {
        PageResult<RoleDto> result = roleService.findPaged(page, size, keyword);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "role.list.fetched", result));
    }

    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<RoleDto>>> getAllRolesNoPaging() {
        List<RoleDto> roles = roleService.getAllRoles();
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "role.list.fetched", roles));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RoleDto>> getRoleById(@PathVariable Long id) {
        RoleDto role = roleService.getRoleById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "role.fetched", role));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RoleDto>> createRole(@RequestBody RoleDto request) {
        String username = getCurrentUsername();
        RoleDto role = roleService.createRole(request, username);
        return ResponseEntity.ok(new ApiResponse<>(true, "CREATED", "role.created", role));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RoleDto>> updateRole(@PathVariable Long id, @RequestBody RoleDto request) {
        String username = getCurrentUsername();
        RoleDto role = roleService.updateRole(id, request, username);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "role.updated", role));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable Long id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "role.deleted", null));
    }

    @GetMapping("/{id}/menus")
    public ResponseEntity<ApiResponse<List<MenuDto>>> getRoleMenus(@PathVariable Long id) {
        List<MenuDto> menus = roleService.getRoleMenus(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "role.menus.fetched", menus));
    }

    @PutMapping("/{id}/menus")
    public ResponseEntity<ApiResponse<List<MenuDto>>> setRoleMenus(
            @PathVariable Long id,
            @RequestBody Map<String, List<Long>> body
    ) {
        List<Long> menuIds = body.getOrDefault("menuIds", List.of());
        String username = getCurrentUsername();
        List<MenuDto> menus = roleService.setRoleMenus(id, menuIds, username);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "role.menus.updated", menus));
    }

    private String getCurrentUsername() {
        JwtUser jwtUser = (JwtUser) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();
        return jwtUser.getUsername();
    }
}
