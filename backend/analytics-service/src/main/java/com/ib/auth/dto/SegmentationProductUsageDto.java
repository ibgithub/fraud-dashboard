package com.ib.auth.dto;

import java.util.List;
import java.util.Map;

public class SegmentationProductUsageDto {

    public static class ClusterItemDto {
        private String clusterId;
        private String personaNameId;
        private String personaNameEn;
        private long customerCount;

        public ClusterItemDto() {}

        public ClusterItemDto(String clusterId, String personaNameId, String personaNameEn, long customerCount) {
            this.clusterId = clusterId;
            this.personaNameId = personaNameId;
            this.personaNameEn = personaNameEn;
            this.customerCount = customerCount;
        }

        public String getClusterId() { return clusterId; }
        public void setClusterId(String clusterId) { this.clusterId = clusterId; }

        public String getPersonaNameId() { return personaNameId; }
        public void setPersonaNameId(String personaNameId) { this.personaNameId = personaNameId; }

        public String getPersonaNameEn() { return personaNameEn; }
        public void setPersonaNameEn(String personaNameEn) { this.personaNameEn = personaNameEn; }

        public long getCustomerCount() { return customerCount; }
        public void setCustomerCount(long customerCount) { this.customerCount = customerCount; }
    }

    public static class ResponseDto {
        private List<ClusterItemDto> clusters;
        private List<String> products;
        private Map<String, List<Double>> usageData;

        public ResponseDto() {}

        public ResponseDto(List<ClusterItemDto> clusters, List<String> products, Map<String, List<Double>> usageData) {
            this.clusters = clusters;
            this.products = products;
            this.usageData = usageData;
        }

        public List<ClusterItemDto> getClusters() { return clusters; }
        public void setClusters(List<ClusterItemDto> clusters) { this.clusters = clusters; }

        public List<String> getProducts() { return products; }
        public void setProducts(List<String> products) { this.products = products; }

        public Map<String, List<Double>> getUsageData() { return usageData; }
        public void setUsageData(Map<String, List<Double>> usageData) { this.usageData = usageData; }
    }
}
