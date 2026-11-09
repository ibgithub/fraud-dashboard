package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.dto.CorporateInsightDto;
import com.ib.auth.repository.BagCorporateInsightRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Corporate Insight PILOT endpoint - backed by the new bag_demo database
 * (ods.mv_h + ods.trb_score). Only this page uses bag_demo; everything else
 * still reads from the primary (altair_demo).
 *
 * Response: a CorporateInsightDto plus per-section "ready" flags so the UI can
 * render "In Progress" for sections that have no real data in bag_demo yet
 * (currently: Top Products, where up/rp are placeholders).
 */
@RestController
@RequestMapping("/api/v1/executive/bag-corporate-insight")
public class BagCorporateInsightController {

    private final BagCorporateInsightRepository repo;

    public BagCorporateInsightController(BagCorporateInsightRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCorporateInsight() {
        CorporateInsightDto dto = new CorporateInsightDto();

        dto.setTotalNasabah(repo.countTotalCustomers());
        dto.setNasabahDormant(repo.countDormantCustomers());
        dto.setNasabahAktif(repo.countActiveCustomers());
        dto.setCabangCakupan(repo.countBranches());
        dto.setTotalDanaSimpanan(repo.totalFundingTrillion());
        dto.setTotalOutstandingLoan(repo.totalLoanTrillion());

        dto.setBranchCustomerTable(repo.getBranchCustomerTable());
        dto.setTrbByBranch(repo.getTrbByBranch());
        dto.setChurnByBranch(repo.getChurnByBranch());
        dto.setSegmentByPersona(repo.getSegmentByPersona());
        dto.setSegmentByArchetype(repo.getSegmentByArchetype());

        // Top 3 products from ods.agg_product_count (excludes loan / blank type).
        List<CorporateInsightDto.TopProductDto> topProducts = repo.getTopProducts();
        dto.setTopProducts(topProducts);

        Map<String, Object> data = new HashMap<>();
        data.put("insight", dto);
        data.put("productsReady", !topProducts.isEmpty());

        // Extra distribution pies (from ods.mv_h) rendered below the TRB pie:
        //  statusDistribution  : status_nasabah (Active / Inactive)
        //  mbDistribution      : mb (Y / N) -> MB user vs non-MB
        //  mbStatusDistribution: mb_status (Active / Inactive) MB activity
        data.put("statusDistribution", repo.getStatusDistribution());
        data.put("mbDistribution", repo.getMobileBankingDistribution());
        data.put("mbStatusDistribution", repo.getMobileBankingStatusDistribution());

        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "bag_corporate_insight.fetched", data));
    }

    /**
     * GET /api/v1/executive/bag-corporate-insight/top-products?productType=TABUNGAN
     * Top 3 best-selling products filtered by product_type (default = all types,
     * excluding blank and 'loan'). Backs the product-type combo box on the card.
     */
    @GetMapping("/top-products")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTopProducts(
            @RequestParam(required = false) String productType) {
        List<CorporateInsightDto.TopProductDto> topProducts = repo.getTopProducts(productType);
        Map<String, Object> data = new HashMap<>();
        data.put("topProducts", topProducts);
        data.put("productsReady", !topProducts.isEmpty());
        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "bag_top_products.fetched", data));
    }
}
