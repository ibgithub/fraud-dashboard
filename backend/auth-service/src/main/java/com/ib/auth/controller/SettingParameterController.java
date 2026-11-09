package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.dto.SettingParameterDto;
import com.ib.auth.security.JwtUser;
import com.ib.auth.service.SettingParameterService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/settings")
public class SettingParameterController {

    private final SettingParameterService service;

    public SettingParameterController(SettingParameterService service) {
        this.service = service;
    }

    // GET /api/settings - semua parameter
    @GetMapping
    public ResponseEntity<ApiResponse<List<SettingParameterDto>>> getAll() {
        List<SettingParameterDto> params = service.getAll();
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "setting.list.fetched", params));
    }

    // GET /api/settings/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SettingParameterDto>> getById(@PathVariable Long id) {
        SettingParameterDto param = service.getById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "setting.fetched", param));
    }

    // GET /api/settings/by-name/{name}
    @GetMapping("/by-name/{name}")
    public ResponseEntity<ApiResponse<SettingParameterDto>> getByName(@PathVariable String name) {
        SettingParameterDto param = service.getByName(name);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "setting.fetched", param));
    }

    // POST /api/settings
    @PostMapping
    public ResponseEntity<ApiResponse<SettingParameterDto>> create(@RequestBody SettingParameterDto request) {
        String username = getCurrentUsername();
        SettingParameterDto param = service.create(request, username);
        return ResponseEntity.ok(new ApiResponse<>(true, "CREATED", "setting.created", param));
    }

    // PUT /api/settings/{id}
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SettingParameterDto>> update(
            @PathVariable Long id,
            @RequestBody SettingParameterDto request) {
        String username = getCurrentUsername();
        SettingParameterDto param = service.update(id, request, username);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "setting.updated", param));
    }

    // DELETE /api/settings/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "setting.deleted", null));
    }

    private String getCurrentUsername() {
        JwtUser jwtUser = (JwtUser) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();
        return jwtUser.getUsername();
    }
}
