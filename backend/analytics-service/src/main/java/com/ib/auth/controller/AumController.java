package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.dto.AumDto;
import com.ib.auth.service.AumService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/executive/aum")
public class AumController {

    private final AumService service;

    public AumController(AumService service) {
        this.service = service;
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AumDto.OverviewDto>> getOverview(
            @RequestParam(defaultValue = "20") int hiPct,
            @RequestParam(defaultValue = "30") int medPct) {
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "aum_overview.fetched",
                service.getOverview(hiPct, medPct)));
    }

    @GetMapping("/ranking")
    public ResponseEntity<ApiResponse<AumDto.RankingResponseDto>> getRanking(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String branch,
            @RequestParam(defaultValue = "20") int hiPct,
            @RequestParam(defaultValue = "30") int medPct) {
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "aum_ranking.fetched",
                service.getRanking(page, size, search, branch, hiPct, medPct)));
    }

    @GetMapping("/branches")
    public ResponseEntity<ApiResponse<List<String>>> getBranches() {
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "branches.fetched", service.getBranches()));
    }
}
