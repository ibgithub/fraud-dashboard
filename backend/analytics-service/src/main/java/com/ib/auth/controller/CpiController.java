package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.dto.CpiHotTargetDto;
import com.ib.auth.service.CpiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/executive/cpi-matrix")
public class CpiController {

    private final CpiService service;

    public CpiController(CpiService service) {
        this.service = service;
    }

    /**
     * GET /api/v1/executive/cpi-matrix/hot-target
     * Returns C3 Quadrant Hot Target KPI metrics and paginated customer list from PostgreSQL.
     */
    @GetMapping("/hot-target")
    public ResponseEntity<ApiResponse<CpiHotTargetDto.ResponseDto>> getHotTargetData(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) String clusters,
            @RequestParam(defaultValue = "33") int churnHiPct,
            @RequestParam(defaultValue = "33") int churnMedPct,
            @RequestParam(defaultValue = "33") int aumHiPct,
            @RequestParam(defaultValue = "33") int aumMedPct,
            @RequestParam(required = false) String personaCluster) {

        CpiHotTargetDto.ResponseDto data =
            service.getHotTargetData(page, size, search, branch, clusters, churnHiPct, churnMedPct, aumHiPct, aumMedPct, personaCluster);
        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "cpi_hot_target.fetched", data)
        );
    }

    /**
     * GET /api/v1/executive/cpi-matrix/branches
     * Returns the list of available branch names for filtering.
     */
    @GetMapping("/branches")
    public ResponseEntity<ApiResponse<List<String>>> getBranches() {
        List<String> data = service.getAvailableBranches();
        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "cpi_branches.fetched", data)
        );
    }
}
