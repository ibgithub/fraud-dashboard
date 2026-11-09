package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.common.PageResult;
import com.ib.auth.dto.ChangePasswordDto;
import com.ib.auth.dto.MenuDto;
import com.ib.auth.dto.RoleDto;
import com.ib.auth.dto.UserDto;
import com.ib.auth.security.JwtUser;
import com.ib.auth.service.RoleService;
import com.ib.auth.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    private final RoleService roleService;

    public UserController(UserService userService, RoleService roleService) {
        this.userService = userService;
        this.roleService = roleService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createUser(@RequestBody UserDto request) {
        JwtUser jwtUser = getJwtUser();
        userService.createUser(request, jwtUser);
        return ResponseEntity.ok(new ApiResponse<>(true, "CREATED", "user.created", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getMyProfile() {
        JwtUser jwtUser = getJwtUser();
        UserDto user = userService.getMyProfile(jwtUser);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "user.profile.fetched", user));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> updateMyProfile(@RequestBody UserDto request) {
        JwtUser jwtUser = getJwtUser();
        request.setId(jwtUser.getUserId());
        request.setUpdatedBy(jwtUser.getUsername());
        request.setPassword(null); // password ganti lewat /me/password
        userService.updateMyProfile(request);
        UserDto updated = userService.getMyProfile(jwtUser);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "user.profile.updated", updated));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateUser(
            @PathVariable Long id,
            @RequestBody UserDto request
    ) {
        JwtUser jwtUser = getJwtUser();
        request.setId(id);
        userService.updateUser(request, jwtUser);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "user.updated", null));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResult<UserDto>>> users(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword) {
        PageResult<UserDto> result = userService.findPaged(page, size, keyword);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "user.list.fetched", result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getById(@PathVariable Long id) {
        UserDto user = userService.getById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "user.fetched", user));
    }

    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changePasswordSelf(@RequestBody ChangePasswordDto request) {
        JwtUser jwtUser = getJwtUser();
        userService.changePasswordSelf(jwtUser.getUserId(), request);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "user.password.changed", null));
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<ApiResponse<Void>> changePasswordByAdmin(
            @PathVariable Long id,
            @RequestBody ChangePasswordDto request
    ) {
        userService.changePasswordByAdmin(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "user.password.changed", null));
    }

    @GetMapping("/me/menus")
    public ResponseEntity<ApiResponse<List<MenuDto>>> getMyMenus() {
        JwtUser jwtUser = getJwtUser();
        List<MenuDto> menus = roleService.getUserMenus(jwtUser.getUserId());
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "user.menus.fetched", menus));
    }

    @GetMapping("/me/roles")
    public ResponseEntity<ApiResponse<List<RoleDto>>> getMyRoles() {
        JwtUser jwtUser = getJwtUser();
        List<RoleDto> roles = roleService.getUserRoles(jwtUser.getUserId());
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "user.roles.fetched", roles));
    }

    @PutMapping("/{id}/roles")
    public ResponseEntity<ApiResponse<List<RoleDto>>> setUserRoles(
            @PathVariable Long id,
            @RequestBody Map<String, List<Long>> body
    ) {
        List<Long> roleIds = body.getOrDefault("roleIds", List.of());
        JwtUser jwtUser = getJwtUser();
        List<RoleDto> roles = roleService.setUserRoles(id, roleIds, jwtUser.getUsername());
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "user.roles.updated", roles));
    }

    @GetMapping("/{id}/roles")
    public ResponseEntity<ApiResponse<List<RoleDto>>> getUserRoles(@PathVariable Long id) {
        List<RoleDto> roles = roleService.getUserRoles(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "user.roles.fetched", roles));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "user.deleted", null));
    }

    @PutMapping("/{id}/unlock")
    public ResponseEntity<ApiResponse<Void>> unlockUser(@PathVariable Long id) {
        userService.unlockUser(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "user.unlocked", null));
    }

    @PutMapping("/{id}/block")
    public ResponseEntity<ApiResponse<Void>> blockUser(@PathVariable Long id) {
        userService.blockUser(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "user.blocked", null));
    }

    private JwtUser getJwtUser() {
        return (JwtUser) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();
    }
}
