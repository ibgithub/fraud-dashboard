package com.ib.auth.dto;

import java.util.List;

/**
 * Product Recommendations (Recommender System) per needs-cluster, aggregated
 * from segmentation.cluster_result over the non-dormant population.
 */
public class RecommenderDto {

    /** One recommended product/service with how often it is the top pick. */
    public static class RecItem {
        private String name;
        private double pct;      // share of customers in the cluster with this as a top rec
        private long count;

        public RecItem() {}
        public RecItem(String name, double pct, long count) {
            this.name = name; this.pct = pct; this.count = count;
        }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public double getPct() { return pct; }
        public void setPct(double pct) { this.pct = pct; }
        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
    }

    /** One cluster with its top banking products + transaction services. */
    public static class ClusterRec {
        private String clusterId;
        private String personaName;
        private String personaNameEn;
        private long customerCount;
        private List<RecItem> bankingProducts;
        private List<RecItem> transactionServices;
        // Short persona description (ID + EN) from persona_strategi_akuisisi /
        // persona_strategi_retensi.deskripsi_persona(_en); shown as a tab tooltip.
        private String description;
        private String descriptionEn;

        public ClusterRec() {}
        public ClusterRec(String clusterId, String personaName, String personaNameEn, long customerCount,
                          List<RecItem> bankingProducts, List<RecItem> transactionServices) {
            this.clusterId = clusterId;
            this.personaName = personaName;
            this.personaNameEn = personaNameEn;
            this.customerCount = customerCount;
            this.bankingProducts = bankingProducts;
            this.transactionServices = transactionServices;
        }
        public String getClusterId() { return clusterId; }
        public void setClusterId(String clusterId) { this.clusterId = clusterId; }
        public String getPersonaName() { return personaName; }
        public void setPersonaName(String personaName) { this.personaName = personaName; }
        public String getPersonaNameEn() { return personaNameEn; }
        public void setPersonaNameEn(String personaNameEn) { this.personaNameEn = personaNameEn; }
        public long getCustomerCount() { return customerCount; }
        public void setCustomerCount(long customerCount) { this.customerCount = customerCount; }
        public List<RecItem> getBankingProducts() { return bankingProducts; }
        public void setBankingProducts(List<RecItem> bankingProducts) { this.bankingProducts = bankingProducts; }
        public List<RecItem> getTransactionServices() { return transactionServices; }
        public void setTransactionServices(List<RecItem> transactionServices) { this.transactionServices = transactionServices; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getDescriptionEn() { return descriptionEn; }
        public void setDescriptionEn(String descriptionEn) { this.descriptionEn = descriptionEn; }
    }
}
