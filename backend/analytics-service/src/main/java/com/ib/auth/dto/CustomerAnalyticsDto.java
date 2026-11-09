package com.ib.auth.dto;

/**
 * One row per cluster/persona from segmentation.customer_analytics.
 * Carries both the Indonesian (base columns) and English (*_en columns)
 * variants so the frontend can pick by language. Drives the Cluster
 * Characteristics page (stats, key characteristic, marketing strategy,
 * recommendation type) entirely from the database (no hardcoded data).
 */
public class CustomerAnalyticsDto {
    private String cluster;
    private String personaName;
    private String personaNameEn;
    private String recommendationType; // "human_approach" | "special_approach"
    private String riskLevel;

    // Statistics
    private Long totalCustomers;
    private Double avgAge;
    private Double avgTenureMonths;
    private Double avgTotalBalance;
    private Double avgProductsHeld;
    private Double avgMonthlyTxn;
    private Double mobileBankingRate; // 0..1

    // Retention-only statistics (persona_strategi_retensi).
    private Double mbShare;        // avg_porsi_mb, 0..1 (share of txn via MB)
    private Double retentionRate;  // tingkat_retensi, 0..1
    private Double avgTotalAssets; // avg_total_aset, IDR

    // Narrative (ID + EN)
    private String keyCharacteristic;
    private String keyCharacteristicEn;
    private String marketingStrategy;
    private String marketingStrategyEn;

    // Short persona description (ID + EN) from persona_strategi_akuisisi /
    // persona_strategi_retensi.deskripsi_persona(_en); shown as a tab tooltip.
    private String description;
    private String descriptionEn;

    // Business strategies sourced from persona_strategi_akuisisi (acquisition
    // path) or persona_strategi_retensi (retention path), each labeled.
    private java.util.List<StrategyItem> strategies;

    /** One labeled strategy (ID + EN label and text). */
    public static class StrategyItem {
        private String label;
        private String labelEn;
        private String text;
        private String textEn;

        public StrategyItem() {}
        public StrategyItem(String label, String labelEn, String text, String textEn) {
            this.label = label; this.labelEn = labelEn; this.text = text; this.textEn = textEn;
        }
        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
        public String getLabelEn() { return labelEn; }
        public void setLabelEn(String labelEn) { this.labelEn = labelEn; }
        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
        public String getTextEn() { return textEn; }
        public void setTextEn(String textEn) { this.textEn = textEn; }
    }

    public CustomerAnalyticsDto() {}

    public String getCluster() { return cluster; }
    public void setCluster(String cluster) { this.cluster = cluster; }

    public String getPersonaName() { return personaName; }
    public void setPersonaName(String personaName) { this.personaName = personaName; }

    public String getPersonaNameEn() { return personaNameEn; }
    public void setPersonaNameEn(String personaNameEn) { this.personaNameEn = personaNameEn; }

    public String getRecommendationType() { return recommendationType; }
    public void setRecommendationType(String recommendationType) { this.recommendationType = recommendationType; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public Long getTotalCustomers() { return totalCustomers; }
    public void setTotalCustomers(Long totalCustomers) { this.totalCustomers = totalCustomers; }

    public Double getAvgAge() { return avgAge; }
    public void setAvgAge(Double avgAge) { this.avgAge = avgAge; }

    public Double getAvgTenureMonths() { return avgTenureMonths; }
    public void setAvgTenureMonths(Double avgTenureMonths) { this.avgTenureMonths = avgTenureMonths; }

    public Double getAvgTotalBalance() { return avgTotalBalance; }
    public void setAvgTotalBalance(Double avgTotalBalance) { this.avgTotalBalance = avgTotalBalance; }

    public Double getAvgProductsHeld() { return avgProductsHeld; }
    public void setAvgProductsHeld(Double avgProductsHeld) { this.avgProductsHeld = avgProductsHeld; }

    public Double getAvgMonthlyTxn() { return avgMonthlyTxn; }
    public void setAvgMonthlyTxn(Double avgMonthlyTxn) { this.avgMonthlyTxn = avgMonthlyTxn; }

    public Double getMobileBankingRate() { return mobileBankingRate; }
    public void setMobileBankingRate(Double mobileBankingRate) { this.mobileBankingRate = mobileBankingRate; }

    public Double getMbShare() { return mbShare; }
    public void setMbShare(Double mbShare) { this.mbShare = mbShare; }

    public Double getRetentionRate() { return retentionRate; }
    public void setRetentionRate(Double retentionRate) { this.retentionRate = retentionRate; }

    public Double getAvgTotalAssets() { return avgTotalAssets; }
    public void setAvgTotalAssets(Double avgTotalAssets) { this.avgTotalAssets = avgTotalAssets; }

    public String getKeyCharacteristic() { return keyCharacteristic; }
    public void setKeyCharacteristic(String keyCharacteristic) { this.keyCharacteristic = keyCharacteristic; }

    public String getKeyCharacteristicEn() { return keyCharacteristicEn; }
    public void setKeyCharacteristicEn(String keyCharacteristicEn) { this.keyCharacteristicEn = keyCharacteristicEn; }

    public String getMarketingStrategy() { return marketingStrategy; }
    public void setMarketingStrategy(String marketingStrategy) { this.marketingStrategy = marketingStrategy; }

    public String getMarketingStrategyEn() { return marketingStrategyEn; }
    public void setMarketingStrategyEn(String marketingStrategyEn) { this.marketingStrategyEn = marketingStrategyEn; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getDescriptionEn() { return descriptionEn; }
    public void setDescriptionEn(String descriptionEn) { this.descriptionEn = descriptionEn; }

    public java.util.List<StrategyItem> getStrategies() { return strategies; }
    public void setStrategies(java.util.List<StrategyItem> strategies) { this.strategies = strategies; }
}
