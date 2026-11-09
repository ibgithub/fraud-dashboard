package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.dto.AgeDistributionDto;
import com.ib.auth.dto.BranchDistributionDto;
import com.ib.auth.dto.DemographicKpiDto;
import com.ib.auth.dto.GenderDistributionDto;
import com.ib.auth.service.DemographicService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/executive/demographic")
public class DemographicController {

    private final DemographicService demographicService;

    public DemographicController(DemographicService demographicService) {
        this.demographicService = demographicService;
    }

    /**
     * GET /api/v1/executive/demographic/kpi
     * Returns 4 KPI cards: Total Nasabah Aktif, Pertumbuhan Bulan Ini,
     * Rata-rata Saldo (AUM), Total Dana Kelolaan (AUM).
     */
    @GetMapping("/kpi")
    public ResponseEntity<ApiResponse<DemographicKpiDto>> getKpi() {
        DemographicKpiDto kpi = demographicService.getKpi();
        return ResponseEntity.ok(
                new ApiResponse<>(true, "SUCCESS", "demographic.kpi.fetched", kpi)
        );
    }

    /**
     * GET /api/v1/executive/demographic/branch-distribution?limit=10
     * Returns distribusi nasabah per kota, sorted descending.
     * Optional limit parameter to show top N + "Lainnya".
     */
    @GetMapping("/branch-distribution")
    public ResponseEntity<ApiResponse<List<BranchDistributionDto>>> getBranchDistribution(
            @RequestParam(required = false) Integer limit) {

        if (limit != null && limit < 1) {
            return ResponseEntity.badRequest().body(
                    new ApiResponse<>(false, "VALIDATION_ERROR", "Limit harus minimal 1", null)
            );
        }

        List<BranchDistributionDto> data = demographicService.getBranchDistribution(limit);
        return ResponseEntity.ok(
                new ApiResponse<>(true, "SUCCESS", "demographic.branch_distribution.fetched", data)
        );
    }

    /**
     * GET /api/v1/executive/demographic/age-distribution
     * Returns distribusi usia nasabah dalam 5 kategori.
     */
    @GetMapping("/age-distribution")
    public ResponseEntity<ApiResponse<List<AgeDistributionDto>>> getAgeDistribution() {
        List<AgeDistributionDto> data = demographicService.getAgeDistribution();
        return ResponseEntity.ok(
                new ApiResponse<>(true, "SUCCESS", "demographic.age_distribution.fetched", data)
        );
    }

    /**
     * GET /api/v1/executive/demographic/gender-distribution
     * Returns distribusi gender nasabah (Pria/Wanita).
     */
    @GetMapping("/gender-distribution")
    public ResponseEntity<ApiResponse<List<GenderDistributionDto>>> getGenderDistribution() {
        List<GenderDistributionDto> data = demographicService.getGenderDistribution();
        return ResponseEntity.ok(
                new ApiResponse<>(true, "SUCCESS", "demographic.gender_distribution.fetched", data)
        );
    }
}
