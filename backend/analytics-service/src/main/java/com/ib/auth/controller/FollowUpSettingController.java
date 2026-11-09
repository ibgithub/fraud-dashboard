package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.dto.FollowUpSettingDto;
import com.ib.auth.service.FollowUpSettingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * "Setting Tindak Lanjut" (follow-up offer parameters) for the Hot Target /
 * Bisnis Strategi Per Cluster page. Settings are scoped by (cluster, branch);
 * a null/blank branch means the global (admin / HQ) scope.
 */
@RestController
@RequestMapping("/api/v1/executive/follow-up-settings")
public class FollowUpSettingController {

    private final FollowUpSettingService service;

    public FollowUpSettingController(FollowUpSettingService service) {
        this.service = service;
    }

    /**
     * GET /api/v1/executive/follow-up-settings?cluster=cluster_0&branch=
     * Returns the parameter rows for the given (cluster, branch) scope.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<FollowUpSettingDto.Item>>> get(
            @RequestParam String cluster,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) String cif) {
        List<FollowUpSettingDto.Item> data = service.getSettings(cluster, branch, cif);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "follow_up_setting.fetched", data));
    }

    /**
     * POST /api/v1/executive/follow-up-settings
     * Replaces the full set of parameter rows for a (cluster, branch) scope.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<List<FollowUpSettingDto.Item>>> save(
            @RequestBody FollowUpSettingDto.SaveRequest request) {
        List<FollowUpSettingDto.Item> data = service.saveSettings(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "follow_up_setting.saved", data));
    }
}
