package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.dto.MatrixMaterializeDto;
import com.ib.auth.service.MatrixMaterializationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/executive/matrix")
public class MatrixMaterializationController {

    private final MatrixMaterializationService service;

    public MatrixMaterializationController(MatrixMaterializationService service) {
        this.service = service;
    }

    /**
     * POST /api/v1/executive/matrix/materialise-churn?hiPct=51&medPct=25
     * Insert churned customers (if not present) and classify churn_category.
     * Also recomputes matrix_classification where aum_category exists.
     */
    @PostMapping("/materialise-churn")
    public ResponseEntity<ApiResponse<MatrixMaterializeDto>> materialiseChurn(
            @RequestParam(defaultValue = "33") int hiPct,
            @RequestParam(defaultValue = "33") int medPct) {
        MatrixMaterializeDto result = service.materialiseChurn(hiPct, medPct);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "matrix.churn.materialised", result));
    }

    /**
     * POST /api/v1/executive/matrix/materialise-aum?hiPct=49&medPct=33
     * Insert churned customers (if not present) and classify aum_category.
     * Also recomputes matrix_classification where churn_category exists.
     */
    @PostMapping("/materialise-aum")
    public ResponseEntity<ApiResponse<MatrixMaterializeDto>> materialiseAum(
            @RequestParam(defaultValue = "33") int hiPct,
            @RequestParam(defaultValue = "33") int medPct) {
        MatrixMaterializeDto result = service.materialiseAum(hiPct, medPct);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "matrix.aum.materialised", result));
    }

    /**
     * GET /api/v1/executive/matrix/distribution
     * Returns 9-cell matrix counts from churn.churn_data_matrix.
     * Keys: aum_churn (hi_hi, hi_med, …, lo_lo).
     */
    @GetMapping("/distribution")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> getDistribution() {
        Map<String, Integer> dist = service.getMatrixFromTable();
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "matrix.distribution.fetched", dist));
    }

    /**
     * POST /api/v1/executive/matrix/select
     * Body: { "keys": ["hi_hi","med_med"] }  (matrix_classification values)
     * Marks matching customers is_selected=true, everyone else false.
     */
    @PostMapping("/select")
    public ResponseEntity<ApiResponse<Map<String, Object>>> selectClusters(
            @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        java.util.List<String> keys = body.get("keys") instanceof java.util.List
                ? ((java.util.List<Object>) body.get("keys")).stream().map(String::valueOf).map(String::toLowerCase).toList()
                : java.util.List.of();
        int selected = service.selectClusters(keys);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("selectedRows", selected);
        data.put("keys", keys);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "matrix.selection.updated", data));
    }

    /**
     * GET /api/v1/executive/matrix/status
     * Returns readiness flags so the frontend can decide whether to show
     * the "please configure Threshold Tiering first" message.
     * Also returns selectedKeys to restore previous selection.
     */
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("churnClassified",   service.isChurnClassified());
        status.put("aumClassified",     service.isAumClassified());
        status.put("matrixReady",       service.isMatrixReady());
        status.put("availableKeys",     service.getAvailableClassifications());
        status.put("selectedKeys",      service.getSelectedClassifications());
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "matrix.status.fetched", status));
    }
}
