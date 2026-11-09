package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.common.PageResult;
import com.ib.auth.dto.AuditLogDto;
import com.ib.auth.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditService auditService;

    public AuditLogController(AuditService auditService) {
        this.auditService = auditService;
    }

    // GET /api/audit-logs?page=0&size=10&keyword=&action=
    @GetMapping
    public ResponseEntity<ApiResponse<PageResult<AuditLogDto>>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String action) {
        PageResult<AuditLogDto> result = auditService.findPaged(page, size, keyword, action);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "audit.list.fetched", result));
    }
}
