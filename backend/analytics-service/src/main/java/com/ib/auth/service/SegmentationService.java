package com.ib.auth.service;

import com.ib.auth.dto.CustomerAnalyticsDto;
import com.ib.auth.dto.SegmentationProductUsageDto;
import com.ib.auth.repository.BagSegmentationRepository;
import com.ib.auth.repository.SegmentationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SegmentationService {

    private final SegmentationRepository segmentationRepository;
    private final BagSegmentationRepository bagSegmentationRepository;

    public SegmentationService(SegmentationRepository segmentationRepository,
                               BagSegmentationRepository bagSegmentationRepository) {
        this.segmentationRepository = segmentationRepository;
        this.bagSegmentationRepository = bagSegmentationRepository;
    }

    public SegmentationProductUsageDto.ResponseDto getProductUsageData() {
        // Product Usage Analysis now reads from bag_demo (segmentation.cluster_result
        // aggregated per needs-cluster). Fall back to the legacy source only if the
        // bag_demo query returns nothing.
        SegmentationProductUsageDto.ResponseDto bag = bagSegmentationRepository.getProductUsageFromBagDemo();
        if (bag != null && bag.getClusters() != null && !bag.getClusters().isEmpty()) {
            return bag;
        }
        return segmentationRepository.getProductUsageData();
    }

    /** Retention-side product usage (per mb_archetype) from bag_demo. */
    public SegmentationProductUsageDto.ResponseDto getProductUsageRetentionData() {
        return bagSegmentationRepository.getProductUsageRetention();
    }

    public List<CustomerAnalyticsDto> getCustomerAnalytics() {
        return segmentationRepository.getCustomerAnalytics();
    }
}
