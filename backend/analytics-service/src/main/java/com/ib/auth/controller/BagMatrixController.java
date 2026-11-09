package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.repository.BagMatrixRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Customer Matrix PILOT endpoints - backed by the new bag_demo database
 * (ods.mv_h + ods.trb_score). Only this page uses bag_demo; everything else
 * still reads from the primary (altair_demo).
 *
 * Response shape:
 *   { ready: bool,                 // false => UI shows "In Progress" / empty
 *     churnTrb: { "<trb>_<churn>": count, ... },        // 3x3 Churn x TRB
 *     activityTrb: { "<segment>_<trb>": count, ... } }  // 3x3 Activity x TRB
 *     // segments: inactiveCust / unregMb / inactiveMb; trb: lo/med/hi
 */
@RestController
@RequestMapping("/api/v1/executive/bag-matrix")
public class BagMatrixController {

    private final BagMatrixRepository repo;

    public BagMatrixController(BagMatrixRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMatrix(
            @RequestParam(defaultValue = "33") double churnHiPct,
            @RequestParam(defaultValue = "33") double churnMedPct,
            @RequestParam(defaultValue = "33") double trbHiPct,
            @RequestParam(defaultValue = "33") double trbMedPct) {

        Map<String, Object> data = new HashMap<>();
        boolean ready = repo.isReady();
        data.put("ready", ready);

        if (ready) {
            data.put("churnTrb", repo.churnTrbDistribution(
                (int) Math.round(churnHiPct), (int) Math.round(churnMedPct),
                (int) Math.round(trbHiPct), (int) Math.round(trbMedPct)));
            data.put("activityTrb", repo.activitySegmentTrbDistribution(
                (int) Math.round(trbHiPct), (int) Math.round(trbMedPct)));
            data.put("selectedKeys", repo.getSelectedChurnKeys());
            data.put("selectedActivityKeys", repo.getSelectedActivityKeys());
            data.put("selectedCustomerCount", repo.selectedCustomerCount());
        } else {
            data.put("churnTrb", new HashMap<>());
            data.put("activityTrb", new HashMap<>());
            data.put("selectedKeys", List.of());
            data.put("selectedActivityKeys", List.of());
            data.put("selectedCustomerCount", 0L);
        }

        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "bag_matrix.fetched", data));
    }

    /**
     * POST /api/v1/executive/bag-matrix/select
     * Body: { "keys": ["hi_hi","med_med"] }  (matrix_classification values)
     * Marks matching customers in bag_demo ods.churn_data_matrix is_selected=true,
     * everyone else false.
     */
    @PostMapping("/select")
    public ResponseEntity<ApiResponse<Map<String, Object>>> selectCells(
            @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> keys = body.get("keys") instanceof List
                ? ((List<Object>) body.get("keys")).stream().map(String::valueOf).map(String::toLowerCase).toList()
                : List.of();
        int selected = repo.selectChurnCells(keys);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("selectedRows", selected);
        data.put("keys", keys);
        data.put("selectedCustomerCount", repo.selectedCustomerCount());
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "bag_matrix.selection.updated", data));
    }

    /**
     * POST /api/v1/executive/bag-matrix/rebuild
     * Rebuilds bag_demo ods.churn_data_matrix from the predicted-churn population
     * using the given tier split percentages (0-100). Called by the Threshold
     * Tiering page after the distribution settings are saved.
     * Params: churnHiPct, churnMedPct, trbHiPct, trbMedPct.
     */
    @PostMapping("/rebuild")
    public ResponseEntity<ApiResponse<Map<String, Object>>> rebuildMatrix(
            @RequestParam(defaultValue = "39") double churnHiPct,
            @RequestParam(defaultValue = "25") double churnMedPct,
            @RequestParam(defaultValue = "34") double trbHiPct,
            @RequestParam(defaultValue = "33") double trbMedPct) {
        int rows = repo.rebuildChurnDataMatrix(churnHiPct, churnMedPct, trbHiPct, trbMedPct);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("rows", rows);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "bag_matrix.rebuilt", data));
    }

    /**
     * GET /api/v1/executive/bag-matrix/persona-options
     * Persona-cluster dropdown options (bag_demo needs_cluster personas).
     */
    @GetMapping("/persona-options")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPersonaOptions(
            @RequestParam(required = false, defaultValue = "acquisition") String mode) {
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "bag_matrix.persona_options",
                repo.getPersonaOptions(mode)));
    }

    /**
     * GET /api/v1/executive/bag-matrix/customer-profile?cif=XXX
     * Customer 360 profile (demographics + products + balance) for one CIF,
     * used by the Action Plan Template page.
     */
    @GetMapping("/customer-profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCustomerProfile(
            @RequestParam String cif) {
        Map<String, Object> data = repo.getCustomerProfile(cif);
        if (data == null) {
            return ResponseEntity.ok(new ApiResponse<>(false, "NOT_FOUND", "bag_matrix.customer_profile.not_found", new LinkedHashMap<>()));
        }
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "bag_matrix.customer_profile", data));
    }

    /**
     * GET /api/v1/executive/bag-matrix/selected-customers
     * Paginated list of selected customers (is_selected in either bag matrix) for
     * the Action Plan Detail page. Params: page, size, personaCluster, search, lang.
     */
    @GetMapping("/selected-customers")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSelectedCustomers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String personaCluster,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "id") String lang,
            @RequestParam(required = false, defaultValue = "acquisition") String mode,
            @RequestParam(required = false) String branch) {
        int s = size > 0 ? Math.min(size, 100000) : 50;
        Map<String, Object> data = repo.getSelectedCustomerList(page, s, personaCluster, search, lang, mode, branch);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "bag_matrix.selected_customers", data));
    }

    /**
     * GET /api/v1/executive/bag-matrix/branches
     * Distinct branch names present among the selected customers, for the
     * per-branch filter on the Action Plan Detail page.
     */
    @GetMapping("/branches")
    public ResponseEntity<ApiResponse<List<String>>> getSelectedCustomerBranches() {
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "bag_matrix.branches",
                repo.getSelectedCustomerBranches()));
    }

    /**
     * POST /api/v1/executive/bag-matrix/refresh-selected-list
     * Synchronously refresh the selected-customer MV so the Action Plan Detail
     * list is up to date. Called when the user presses "Continue" on the
     * Customer Matrix page; the response returns only after the refresh finishes.
     */
    @PostMapping("/refresh-selected-list")
    public ResponseEntity<ApiResponse<Map<String, Object>>> refreshSelectedList() {
        boolean ok = repo.refreshSelectedCustomerListSync();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("refreshed", ok);
        return ResponseEntity.ok(new ApiResponse<>(ok, ok ? "SUCCESS" : "ERROR",
                "bag_matrix.refresh_selected_list", data));
    }

    /**
     * GET /api/v1/executive/bag-matrix/selected-distribution
     * Segmentation distribution of the SELECTED customers only (Hot Target
     * doughnut). Totals match "Selected total" (scoped to the matrix selection),
     * unlike /segmentation/bag-overview which covers the whole population.
     * Returns both tabs: segments (acquisition, needs_cluster) and archetypes
     * (retention, mb_archetype). Each row: {segment, name, nameEn, count, pct}.
     */
    @GetMapping("/selected-distribution")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSelectedDistribution() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("segments", withPct(repo.getSelectedSegmentDistribution("acquisition")));
        data.put("archetypes", withPct(repo.getSelectedSegmentDistribution("retention")));
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS",
                "bag_matrix.selected_distribution", data));
    }

    /** Add a pct field (one decimal) to each distribution row, based on the sum. */
    private static List<Map<String, Object>> withPct(List<Map<String, Object>> rows) {
        long total = 0;
        for (Map<String, Object> r : rows) total += ((Number) r.get("count")).longValue();
        for (Map<String, Object> r : rows) {
            long c = ((Number) r.get("count")).longValue();
            r.put("pct", total > 0 ? Math.round((c * 1000.0) / total) / 10.0 : 0.0);
        }
        return rows;
    }

    /**
     * GET /api/v1/executive/bag-matrix/selected
     * Returns the cells currently selected (is_selected=TRUE) in BOTH bag tables,
     * with per-cell row counts, plus the distinct-customer total across both.
     *   { churn: [{classification, count} ...],
     *     activity: [{classification, count} ...],
     *     total: <distinct cif across both> }
     */
    @GetMapping("/selected")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSelected() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("churn", repo.getSelectedCells("churn"));
        data.put("activity", repo.getSelectedCells("activity"));
        data.put("total", repo.selectedCustomerCount());
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "bag_matrix.selected", data));
    }

    /**
     * POST /api/v1/executive/bag-matrix/selected-count
     * Body: { "churnKeys": ["hi_hi",...], "activityKeys": ["inactiveMb_hi",...] }
     * Returns the distinct-customer (cif) count across BOTH selections, overlap
     * counted once. STATELESS — does not depend on is_selected in the DB.
     */
    @PostMapping("/selected-count")
    public ResponseEntity<ApiResponse<Map<String, Object>>> selectedCount(
            @RequestBody Map<String, Object> body) {
        List<String> churnKeys = toStringList(body.get("churnKeys"));
        List<String> activityKeys = toStringList(body.get("activityKeys"));
        long count = repo.countSelectedCustomers(churnKeys, activityKeys);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("selectedCustomerCount", count);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "bag_matrix.selected_count", data));
    }

    @SuppressWarnings("unchecked")
    private static List<String> toStringList(Object o) {
        if (o instanceof List) {
            return ((List<Object>) o).stream().map(String::valueOf).toList();
        }
        return List.of();
    }

    /**
     * POST /api/v1/executive/bag-matrix/select-activity
     * Body: { "keys": ["inactiveMb_hi","unregMb_lo"] }  (frontend segment_trb keys)
     * Marks matching customers in bag_demo ods.activity_data_matrix is_selected=true,
     * everyone else false.
     */
    @PostMapping("/select-activity")
    public ResponseEntity<ApiResponse<Map<String, Object>>> selectActivityCells(
            @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> keys = body.get("keys") instanceof List
                ? ((List<Object>) body.get("keys")).stream().map(String::valueOf).toList()
                : List.of();
        int selected = repo.selectActivityCells(keys);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("selectedRows", selected);
        data.put("keys", keys);
        data.put("selectedCustomerCount", repo.selectedCustomerCount());
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "bag_matrix.activity_selection.updated", data));
    }
}
