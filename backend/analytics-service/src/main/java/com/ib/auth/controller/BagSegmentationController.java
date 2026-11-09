package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.dto.CustomerAnalyticsDto;
import com.ib.auth.repository.BagSegmentationRepository;
import com.ib.auth.repository.BagSegmentationRepository.SegmentCount;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Segmentation Overview PILOT endpoint - backed by the new bag_demo database
 * (segmentation.cluster_persona). Only this page uses bag_demo; everything else
 * still reads from the primary (altair_demo).
 *
 * Mapped under /api/v1/executive/** so nginx proxies it to analytics-service
 * (the /api/v1/executive location). Paths outside that prefix fall through to
 * auth-service and would 401.
 *
 * Response:
 *   {
 *     segmentsReady: bool,          // false => persona cards / cluster size show "In Progress"
 *     totalCustomers: long,
 *     segments: [ { segment, name, nameEn, count, avgAge, pct } ... ],
 *     demographics: [               // per segment, from ods.mv_segment_demographics
 *       { segment, name, nameEn, total, metrics: {
 *           age_bucket: [ { key, label, labelEn, count, statValue } ... ],
 *           age_stats:  [ ... ],    // statValue carries avg/min/max
 *           gender:     [ ... ],
 *           marital:    [ ... ],
 *           occupation: [ ... ]
 *       } } ...
 *     ],
 *     demographicsReady: true,      // ready once the MV returns rows
 *     metricsReady: false           // cluster ratio / Calinski-Harabasz absent -> In Progress
 *   }
 */
@RestController
@RequestMapping("/api/v1/executive/segmentation/bag-overview")
public class BagSegmentationController {

    private final BagSegmentationRepository repo;

    public BagSegmentationController(BagSegmentationRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOverview() {
        List<SegmentCount> counts = repo.getSegmentCounts();
        long total = counts.stream().mapToLong(SegmentCount::getCount).sum();

        List<Map<String, Object>> segments = new ArrayList<>();
        for (SegmentCount c : counts) {
            Map<String, Object> m = new HashMap<>();
            m.put("segment", c.getSegment());
            m.put("name", c.getName());
            m.put("nameEn", c.getNameEn());
            m.put("count", c.getCount());
            m.put("avgAge", c.getAvgAge());
            m.put("pct", total > 0 ? Math.round((c.getCount() * 1000.0) / total) / 10.0 : 0.0);
            segments.add(m);
        }

        // Retention archetypes (second tab of the distribution box).
        List<SegmentCount> archCounts = repo.getArchetypeCounts();
        long archTotal = archCounts.stream().mapToLong(SegmentCount::getCount).sum();
        List<Map<String, Object>> archetypes = new ArrayList<>();
        for (SegmentCount c : archCounts) {
            Map<String, Object> m = new HashMap<>();
            m.put("segment", c.getSegment());
            m.put("name", c.getName());
            m.put("nameEn", c.getNameEn());
            m.put("count", c.getCount());
            m.put("pct", archTotal > 0 ? Math.round((c.getCount() * 1000.0) / archTotal) / 10.0 : 0.0);
            archetypes.add(m);
        }

        // Demographics PER SEGMENT from ods.mv_segment_demographics (ready metrics
        // only: age, gender, marital, occupation). Dormant excluded in the MV.
        // Education/province live in the MV but are intentionally not exposed yet.
        List<Map<String, Object>> demographics = repo.getDemographics();
        // Retention-side demographics (per mb_archetype) for the Retention tab.
        List<Map<String, Object>> demographicsRetention = repo.getDemographicsRetention();

        Map<String, Object> data = new HashMap<>();
        data.put("segmentsReady", !segments.isEmpty());
        data.put("totalCustomers", total);
        data.put("segments", segments);
        data.put("archetypes", archetypes);
        data.put("archetypesReady", !archetypes.isEmpty());
        data.put("demographics", demographics);
        data.put("demographicsReady", !demographics.isEmpty()); // per-segment Age/Gender/Marital/Occupation
        data.put("demographicsRetention", demographicsRetention);
        data.put("demographicsRetentionReady", !demographicsRetention.isEmpty());
        data.put("metricsReady", false);       // cluster size ratio + Calinski-Harabasz

        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "bag_segmentation_overview.fetched", data));
    }

    /**
     * Characteristics & Strategy page data, from segmentation.cluster_persona
     * in bag_demo. Returns one CustomerAnalyticsDto per persona cluster.
     * GET /api/v1/executive/segmentation/bag-overview/characteristics
     */
    @GetMapping("/characteristics")
    public ResponseEntity<ApiResponse<List<CustomerAnalyticsDto>>> getCharacteristics() {
        List<CustomerAnalyticsDto> data = repo.getClusterPersonaCharacteristics();
        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "bag_segmentation_characteristics.fetched", data));
    }

    /**
     * Retention Characteristics & Strategy, one row per mb_archetype from
     * segmentation.persona_strategi_retensi in bag_demo.
     * GET /api/v1/executive/segmentation/bag-overview/characteristics-retention
     */
    @GetMapping("/characteristics-retention")
    public ResponseEntity<ApiResponse<List<CustomerAnalyticsDto>>> getCharacteristicsRetention() {
        List<CustomerAnalyticsDto> data = repo.getRetentionCharacteristics();
        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "bag_segmentation_characteristics_retention.fetched", data));
    }

    /**
     * Product Recommendations per needs-cluster (top-3 banking + top-3 service),
     * from bag_demo (segmentation.cluster_result, non-dormant).
     * GET /api/v1/executive/segmentation/bag-overview/recommender
     */
    @GetMapping("/recommender")
    public ResponseEntity<ApiResponse<List<com.ib.auth.dto.RecommenderDto.ClusterRec>>> getRecommender() {
        List<com.ib.auth.dto.RecommenderDto.ClusterRec> data = repo.getRecommenderByCluster();
        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "bag_recommender.fetched", data));
    }

    /**
     * Retention product recommendations per mb_archetype (Mobile Banking tab).
     * GET /api/v1/executive/segmentation/bag-overview/recommender-retention
     */
    @GetMapping("/recommender-retention")
    public ResponseEntity<ApiResponse<List<com.ib.auth.dto.RecommenderDto.ClusterRec>>> getRecommenderRetention() {
        List<com.ib.auth.dto.RecommenderDto.ClusterRec> data = repo.getRecommenderByArchetype();
        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "bag_recommender_retention.fetched", data));
    }

    /**
     * Segmentation Model Performance from ml_eva.cluster_model_selection.
     * GET /api/v1/executive/segmentation/bag-overview/model-performance
     */
    @GetMapping("/model-performance")
    public ResponseEntity<ApiResponse<com.ib.auth.dto.SegmentationModelPerfDto>> getModelPerformance() {
        com.ib.auth.dto.SegmentationModelPerfDto data = repo.getSegmentationModelPerformance();
        return ResponseEntity.ok(
            new ApiResponse<>(true, "SUCCESS", "bag_segmentation_model_performance.fetched", data));
    }
}
