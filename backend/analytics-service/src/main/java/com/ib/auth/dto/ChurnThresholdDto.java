package com.ib.auth.dto;

import java.util.List;

public class ChurnThresholdDto {
    private Integer totalNasabah;
    private Integer lowCount;
    private Integer medCount;
    private Integer highCount;

    // Thresholds used for tiering (Churn Index 0-100 scale)
    private Integer lowToMedThreshold;  // e.g. 30
    private Integer medToHighThreshold; // e.g. 70

    private List<ScoreBandDto> distribution;

    // Fine-grained histogram: 100 buckets, index = churn index (0..99),
    // value = number of customers whose churn index falls in [i, i+1).
    // Lets the UI compute exact tier counts for any threshold.
    private List<Integer> histogram;

    public ChurnThresholdDto() {}

    public List<Integer> getHistogram() { return histogram; }
    public void setHistogram(List<Integer> histogram) { this.histogram = histogram; }

    public Integer getTotalNasabah() { return totalNasabah; }
    public void setTotalNasabah(Integer totalNasabah) { this.totalNasabah = totalNasabah; }

    public Integer getLowCount() { return lowCount; }
    public void setLowCount(Integer lowCount) { this.lowCount = lowCount; }

    public Integer getMedCount() { return medCount; }
    public void setMedCount(Integer medCount) { this.medCount = medCount; }

    public Integer getHighCount() { return highCount; }
    public void setHighCount(Integer highCount) { this.highCount = highCount; }

    public Integer getLowToMedThreshold() { return lowToMedThreshold; }
    public void setLowToMedThreshold(Integer lowToMedThreshold) { this.lowToMedThreshold = lowToMedThreshold; }

    public Integer getMedToHighThreshold() { return medToHighThreshold; }
    public void setMedToHighThreshold(Integer medToHighThreshold) { this.medToHighThreshold = medToHighThreshold; }

    public List<ScoreBandDto> getDistribution() { return distribution; }
    public void setDistribution(List<ScoreBandDto> distribution) { this.distribution = distribution; }

    public static class ScoreBandDto {
        private String band;   // e.g. "0-20"
        private Integer count;
        private String tier;   // Lo / Med / Hi

        public ScoreBandDto() {}
        public ScoreBandDto(String band, Integer count, String tier) {
            this.band = band;
            this.count = count;
            this.tier = tier;
        }

        public String getBand() { return band; }
        public void setBand(String band) { this.band = band; }
        public Integer getCount() { return count; }
        public void setCount(Integer count) { this.count = count; }
        public String getTier() { return tier; }
        public void setTier(String tier) { this.tier = tier; }
    }
}
