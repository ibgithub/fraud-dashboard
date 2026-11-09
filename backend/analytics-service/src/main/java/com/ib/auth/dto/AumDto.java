package com.ib.auth.dto;

import java.util.List;

public class AumDto {

    // ---- Overview ----
    public static class OverviewDto {
        private long totalCustomers;
        private double totalAum;        // sum of AUM (raw IDR)
        private double avgAum;          // average AUM (raw IDR)
        private double maxAum;
        private double minAum;
        private int highCount;          // top tier by AUM
        private int medCount;
        private int lowCount;
        private List<BranchAumDto> branchDistribution;

        public long getTotalCustomers() { return totalCustomers; }
        public void setTotalCustomers(long totalCustomers) { this.totalCustomers = totalCustomers; }
        public double getTotalAum() { return totalAum; }
        public void setTotalAum(double totalAum) { this.totalAum = totalAum; }
        public double getAvgAum() { return avgAum; }
        public void setAvgAum(double avgAum) { this.avgAum = avgAum; }
        public double getMaxAum() { return maxAum; }
        public void setMaxAum(double maxAum) { this.maxAum = maxAum; }
        public double getMinAum() { return minAum; }
        public void setMinAum(double minAum) { this.minAum = minAum; }
        public int getHighCount() { return highCount; }
        public void setHighCount(int highCount) { this.highCount = highCount; }
        public int getMedCount() { return medCount; }
        public void setMedCount(int medCount) { this.medCount = medCount; }
        public int getLowCount() { return lowCount; }
        public void setLowCount(int lowCount) { this.lowCount = lowCount; }
        public List<BranchAumDto> getBranchDistribution() { return branchDistribution; }
        public void setBranchDistribution(List<BranchAumDto> branchDistribution) { this.branchDistribution = branchDistribution; }
    }

    public static class BranchAumDto {
        private String branch;
        private long customers;
        private double totalAum;

        public BranchAumDto() {}
        public BranchAumDto(String branch, long customers, double totalAum) {
            this.branch = branch;
            this.customers = customers;
            this.totalAum = totalAum;
        }
        public String getBranch() { return branch; }
        public void setBranch(String branch) { this.branch = branch; }
        public long getCustomers() { return customers; }
        public void setCustomers(long customers) { this.customers = customers; }
        public double getTotalAum() { return totalAum; }
        public void setTotalAum(double totalAum) { this.totalAum = totalAum; }
    }

    // ---- Ranking ----
    public static class RankingItemDto {
        private String cif;
        private String name;
        private String branch;
        private double aum;
        private String tier;

        public RankingItemDto() {}
        public RankingItemDto(String cif, String name, String branch, double aum, String tier) {
            this.cif = cif;
            this.name = name;
            this.branch = branch;
            this.aum = aum;
            this.tier = tier;
        }
        public String getCif() { return cif; }
        public void setCif(String cif) { this.cif = cif; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getBranch() { return branch; }
        public void setBranch(String branch) { this.branch = branch; }
        public double getAum() { return aum; }
        public void setAum(double aum) { this.aum = aum; }
        public String getTier() { return tier; }
        public void setTier(String tier) { this.tier = tier; }
    }

    public static class RankingResponseDto {
        private List<RankingItemDto> items;
        private int totalElements;
        private int totalPages;
        private int currentPage;
        private int pageSize;

        public List<RankingItemDto> getItems() { return items; }
        public void setItems(List<RankingItemDto> items) { this.items = items; }
        public int getTotalElements() { return totalElements; }
        public void setTotalElements(int totalElements) { this.totalElements = totalElements; }
        public int getTotalPages() { return totalPages; }
        public void setTotalPages(int totalPages) { this.totalPages = totalPages; }
        public int getCurrentPage() { return currentPage; }
        public void setCurrentPage(int currentPage) { this.currentPage = currentPage; }
        public int getPageSize() { return pageSize; }
        public void setPageSize(int pageSize) { this.pageSize = pageSize; }
    }
}
