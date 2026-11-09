package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.common.PageResult;
import com.ib.auth.dto.MenuDto;
import com.ib.auth.service.RoleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/menus")
public class MenuController {

    private final RoleService roleService;

    public MenuController(RoleService roleService) {
        this.roleService = roleService;
    }

    // GET /api/menus?page=0&size=10&keyword= (paged, untuk halaman menu management)
    @GetMapping
    public ResponseEntity<ApiResponse<PageResult<MenuDto>>> getMenusPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword) {
        PageResult<MenuDto> result = roleService.findMenusPaged(page, size, keyword);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "menu.list.fetched", result));
    }

    // GET /api/menus/all (tanpa paging, untuk checklist di role management)
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<MenuDto>>> getAllMenus() {
        List<MenuDto> menus = roleService.getAllMenus();
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "menu.list.fetched", menus));
    }

    // GET /api/menus/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MenuDto>> getMenuById(@PathVariable Long id) {
        MenuDto menu = roleService.getMenuById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "menu.fetched", menu));
    }

    // POST /api/menus
    @PostMapping
    public ResponseEntity<ApiResponse<MenuDto>> createMenu(@RequestBody MenuDto request) {
        MenuDto menu = roleService.createMenu(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "CREATED", "menu.created", menu));
    }

    // PUT /api/menus/{id}
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MenuDto>> updateMenu(@PathVariable Long id, @RequestBody MenuDto request) {
        MenuDto menu = roleService.updateMenu(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "menu.updated", menu));
    }

    // DELETE /api/menus/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMenu(@PathVariable Long id) {
        roleService.deleteMenu(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "menu.deleted", null));
    }
}
