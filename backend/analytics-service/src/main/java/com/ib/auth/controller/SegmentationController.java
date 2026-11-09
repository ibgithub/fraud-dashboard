package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.dto.CustomerAnalyticsDto;
import com.ib.auth.dto.SegmentationProductUsageDto;
import com.ib.auth.service.SegmentationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/executive/segmentation")
public class SegmentationController {

    private final SegmentationService service;

    public SegmentationController(SegmentationService service) {
        this.service = service;
    }

    /**
     * GET /api/v1/executive/segmentation/product-usage
     * Returns aggregated product usage distribution across customer clusters from PostgreSQL segmentation schema.
     */
    @GetMapping("/product-usage")
    public ResponseEntity<ApiResponse<SegmentationProductUsageDto.ResponseDto>> getProductUsage() {
        SegmentationProductUsageDto.ResponseDto data = service.getProductUsageData();
        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "segmentation_product_usage.fetched", data)
        );
    }

    /**
     * GET /api/v1/executive/segmentation/product-usage-retention
     * Retention-side product usage (per mb_archetype) from bag_demo.
     */
    @GetMapping("/product-usage-retention")
    public ResponseEntity<ApiResponse<SegmentationProductUsageDto.ResponseDto>> getProductUsageRetention() {
        SegmentationProductUsageDto.ResponseDto data = service.getProductUsageRetentionData();
        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "segmentation_product_usage_retention.fetched", data)
        );
    }

    /**
     * GET /api/v1/executive/segmentation/customer-analytics
     * Per-cluster persona analytics (incl. recommendation_type) from
     * segmentation.customer_analytics.
     */
    @GetMapping("/customer-analytics")
    public ResponseEntity<ApiResponse<List<CustomerAnalyticsDto>>> getCustomerAnalytics() {
        List<CustomerAnalyticsDto> data = service.getCustomerAnalytics();
        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "segmentation_customer_analytics.fetched", data)
        );
    }
}
