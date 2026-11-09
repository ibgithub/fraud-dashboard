package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.dto.CorporateInsightDto;
import com.ib.auth.service.CorporateInsightService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/executive/corporate-insight")
public class CorporateInsightController {

    private final CorporateInsightService service;

    public CorporateInsightController(CorporateInsightService service) {
        this.service = service;
    }

    /**
     * GET /api/v1/executive/corporate-insight
     * Returns full corporate insight dashboard summary fetched from PostgreSQL.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<CorporateInsightDto>> getCorporateInsight() {
        CorporateInsightDto data = service.getCorporateInsight();
        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "corporate_insight.fetched", data)
        );
    }
}
