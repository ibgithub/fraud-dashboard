package com.ib.auth.dto;

import java.util.List;

public class ChurnOverviewDto {
    private Integer totalNasabah;
    private Integer predictedChurn;
    private Double churnRate;
    private Integer highRiskCount;
    private Integer mediumRiskCount;
    private Integer lowRiskCount;
    private Double totalAtRiskBalance; // in Million / Billion IDR

    private List<BranchChurnRateDto> branchDistribution;
    private List<TierTrendDto> tierTrend;
    private List<ProbabilityBucketDto> probabilityDistribution; // churn_proba in 10% buckets

    public ChurnOverviewDto() {}

    public Integer getTotalNasabah() { return totalNasabah; }
    public void setTotalNasabah(Integer totalNasabah) { this.totalNasabah = totalNasabah; }

    public Integer getPredictedChurn() { return predictedChurn; }
    public void setPredictedChurn(Integer predictedChurn) { this.predictedChurn = predictedChurn; }

    public Double getChurnRate() { return churnRate; }
    public void setChurnRate(Double churnRate) { this.churnRate = churnRate; }

    public Integer getHighRiskCount() { return highRiskCount; }
    public void setHighRiskCount(Integer highRiskCount) { this.highRiskCount = highRiskCount; }

    public Integer getMediumRiskCount() { return mediumRiskCount; }
    public void setMediumRiskCount(Integer mediumRiskCount) { this.mediumRiskCount = mediumRiskCount; }

    public Integer getLowRiskCount() { return lowRiskCount; }
    public void setLowRiskCount(Integer lowRiskCount) { this.lowRiskCount = lowRiskCount; }

    public Double getTotalAtRiskBalance() { return totalAtRiskBalance; }
    public void setTotalAtRiskBalance(Double totalAtRiskBalance) { this.totalAtRiskBalance = totalAtRiskBalance; }

    public List<BranchChurnRateDto> getBranchDistribution() { return branchDistribution; }
    public void setBranchDistribution(List<BranchChurnRateDto> branchDistribution) { this.branchDistribution = branchDistribution; }

    public List<TierTrendDto> getTierTrend() { return tierTrend; }
    public void setTierTrend(List<TierTrendDto> tierTrend) { this.tierTrend = tierTrend; }

    public List<ProbabilityBucketDto> getProbabilityDistribution() { return probabilityDistribution; }
    public void setProbabilityDistribution(List<ProbabilityBucketDto> probabilityDistribution) { this.probabilityDistribution = probabilityDistribution; }

    public static class BranchChurnRateDto {
        private String branch;
        private Double rate;
        private Integer churnCount;

        public BranchChurnRateDto() {}
        public BranchChurnRateDto(String branch, Double rate, Integer churnCount) {
            this.branch = branch;
            this.rate = rate;
            this.churnCount = churnCount;
        }

        public String getBranch() { return branch; }
        public void setBranch(String branch) { this.branch = branch; }
        public Double getRate() { return rate; }
        public void setRate(Double rate) { this.rate = rate; }
        public Integer getChurnCount() { return churnCount; }
        public void setChurnCount(Integer churnCount) { this.churnCount = churnCount; }
    }

    /** One 10% churn-probability bucket (e.g. "0-10%") and its customer count. */
    public static class ProbabilityBucketDto {
        private String bucket;
        private Integer count;

        public ProbabilityBucketDto() {}
        public ProbabilityBucketDto(String bucket, Integer count) {
            this.bucket = bucket;
            this.count = count;
        }

        public String getBucket() { return bucket; }
        public void setBucket(String bucket) { this.bucket = bucket; }
        public Integer getCount() { return count; }
        public void setCount(Integer count) { this.count = count; }
    }

    public static class TierTrendDto {
        private String month;
        private Integer low;
        private Integer med;
        private Integer high;

        public TierTrendDto() {}
        public TierTrendDto(String month, Integer low, Integer med, Integer high) {
            this.month = month;
            this.low = low;
            this.med = med;
            this.high = high;
        }

        public String getMonth() { return month; }
        public void setMonth(String month) { this.month = month; }
        public Integer getLow() { return low; }
        public void setLow(Integer low) { this.low = low; }
        public Integer getMed() { return med; }
        public void setMed(Integer med) { this.med = med; }
        public Integer getHigh() { return high; }
        public void setHigh(Integer high) { this.high = high; }
    }
}
