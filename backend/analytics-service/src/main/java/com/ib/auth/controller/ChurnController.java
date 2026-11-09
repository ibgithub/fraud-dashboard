package com.ib.auth.controller;

import com.ib.auth.dto.ChurnModelPerformanceDto;
import com.ib.auth.dto.ChurnOverviewDto;
import com.ib.auth.dto.ChurnRankingDto;
import com.ib.auth.dto.ChurnThresholdDto;
import com.ib.auth.service.ChurnService;
import com.ib.auth.service.MatrixMaterializationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/executive/churn")
public class ChurnController {

    private final ChurnService churnService;
    private final MatrixMaterializationService matrixService;

    public ChurnController(ChurnService churnService, MatrixMaterializationService matrixService) {
        this.churnService = churnService;
        this.matrixService = matrixService;
    }

    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getChurnOverview() {
        Map<String, Object> response = new HashMap<>();
        try {
            ChurnOverviewDto data = churnService.getChurnOverview();
            response.put("success", true);
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/ranking")
    public ResponseEntity<Map<String, Object>> getChurnRanking(
            @RequestParam(value = "branch", required = false) String branch,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "page", required = false, defaultValue = "0") Integer page,
            @RequestParam(value = "size", required = false, defaultValue = "10") Integer size,
            @RequestParam(value = "sortBy", required = false) String sortBy,
            @RequestParam(value = "sortDir", required = false) String sortDir,
            @RequestParam(value = "probMin", required = false) Double probMin,
            @RequestParam(value = "probMax", required = false) Double probMax
    ) {
        Map<String, Object> response = new HashMap<>();
        try {
            ChurnRankingDto data = churnService.getChurnRanking(branch, keyword, page, size, sortBy, sortDir, probMin, probMax);
            response.put("success", true);
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Churn-probability distribution (10% buckets) for the ranking page chart,
    // honouring the optional branch filter.
    @GetMapping("/probability-distribution")
    public ResponseEntity<Map<String, Object>> getProbabilityDistribution(
            @RequestParam(value = "branch", required = false) String branch) {
        Map<String, Object> response = new HashMap<>();
        try {
            List<ChurnOverviewDto.ProbabilityBucketDto> data = churnService.getProbabilityDistribution(branch);
            response.put("success", true);
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/model-performance")
    public ResponseEntity<Map<String, Object>> getModelPerformance() {
        Map<String, Object> response = new HashMap<>();
        try {
            ChurnModelPerformanceDto data = churnService.getChurnModelPerformance();
            response.put("success", true);
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    // Churn tier counts from percentage distribution (Hi/Med percent; Lo = balancer).
    @GetMapping("/threshold-tiers")
    public ResponseEntity<Map<String, Object>> getChurnThreshold(
            @RequestParam(value = "hiPct", required = false, defaultValue = "33") int hiPct,
            @RequestParam(value = "medPct", required = false, defaultValue = "33") int medPct) {
        Map<String, Object> response = new HashMap<>();
        try {
            ChurnThresholdDto data = churnService.getChurnThreshold(hiPct, medPct);
            response.put("success", true);
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/aum-tiers")
    public ResponseEntity<Map<String, Object>> getAumThreshold(
            @RequestParam(value = "hiPct", required = false, defaultValue = "33") int hiPct,
            @RequestParam(value = "medPct", required = false, defaultValue = "33") int medPct) {
        Map<String, Object> response = new HashMap<>();
        try {
            ChurnThresholdDto data = churnService.getAumThreshold(hiPct, medPct);
            response.put("success", true);
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/matrix-distribution")
    public ResponseEntity<Map<String, Object>> getMatrixDistribution(
            @RequestParam(value = "churnHiPct", required = false, defaultValue = "33") int churnHiPct,
            @RequestParam(value = "churnMedPct", required = false, defaultValue = "33") int churnMedPct,
            @RequestParam(value = "aumHiPct", required = false, defaultValue = "33") int aumHiPct,
            @RequestParam(value = "aumMedPct", required = false, defaultValue = "33") int aumMedPct) {
        Map<String, Object> response = new HashMap<>();
        try {
            // Use the materialised table when both categories are ready; otherwise
            // fall back to the percentile estimate so the page still renders.
            Map<String, Integer> data = matrixService.isMatrixReady()
                ? matrixService.getMatrixFromTable()
                : churnService.getMatrixDistribution(churnHiPct, churnMedPct, aumHiPct, aumMedPct);
            response.put("success", true);
            response.put("data", data);
            response.put("fromTable", matrixService.isMatrixReady());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/branches")
    public ResponseEntity<Map<String, Object>> getBranches() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<String> data = churnService.getAvailableBranches();
            response.put("success", true);
            response.put("data", data);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
