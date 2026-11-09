package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.dto.RecommendationHistoryDto;
import com.ib.auth.service.RecommendationHistoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/executive/recommendation-history")
public class RecommendationHistoryController {

    private final RecommendationHistoryService service;

    public RecommendationHistoryController(RecommendationHistoryService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<RecommendationHistoryDto.ResponseDto>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String searchCif,
            @RequestParam(required = false) String searchName,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) String segmentation,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type) {
        RecommendationHistoryDto.ResponseDto data =
            service.getHistory(page, size, searchCif, searchName, branch, segmentation, status, type);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "recommendation_history.fetched", data));
    }

    @GetMapping("/branches")
    public ResponseEntity<ApiResponse<List<String>>> getBranches() {
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "branches.fetched", service.getBranches()));
    }

    @GetMapping("/personas")
    public ResponseEntity<ApiResponse<List<String>>> getPersonas() {
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "personas.fetched", service.getPersonas()));
    }
}
