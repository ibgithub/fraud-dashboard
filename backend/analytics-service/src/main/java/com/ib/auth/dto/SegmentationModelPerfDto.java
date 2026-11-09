package com.ib.auth.dto;

import java.util.List;

/**
 * Segmentation Model Performance, from ml_eva.cluster_model_selection
 * (model = 'model1_needs') plus the segmented-customer total from
 * segmentation.cluster_result_aggregate.
 *
 * Fields with no source in ml_eva (modelAccuracy, outlierCount, trainingDate)
 * are left null so the UI can show "In Progress".
 */
public class SegmentationModelPerfDto {

    /** One row of the elbow/selection table (per candidate k). */
    public static class KRow {
        private int k;
        private Double silhouette;
        private Double daviesBouldin;
        private Double calinskiHarabasz;
        private Double inertia;
        private Double porsiMin;

        public KRow() {}
        public KRow(int k, Double silhouette, Double daviesBouldin, Double calinskiHarabasz, Double inertia, Double porsiMin) {
            this.k = k; this.silhouette = silhouette; this.daviesBouldin = daviesBouldin;
            this.calinskiHarabasz = calinskiHarabasz; this.inertia = inertia; this.porsiMin = porsiMin;
        }
        public int getK() { return k; }
        public void setK(int k) { this.k = k; }
        public Double getSilhouette() { return silhouette; }
        public void setSilhouette(Double silhouette) { this.silhouette = silhouette; }
        public Double getDaviesBouldin() { return daviesBouldin; }
        public void setDaviesBouldin(Double daviesBouldin) { this.daviesBouldin = daviesBouldin; }
        public Double getCalinskiHarabasz() { return calinskiHarabasz; }
        public void setCalinskiHarabasz(Double calinskiHarabasz) { this.calinskiHarabasz = calinskiHarabasz; }
        public Double getInertia() { return inertia; }
        public void setInertia(Double inertia) { this.inertia = inertia; }
        public Double getPorsiMin() { return porsiMin; }
        public void setPorsiMin(Double porsiMin) { this.porsiMin = porsiMin; }
    }

    private String model;            // model1_needs
    private Integer optimalK;        // k with the lowest Davies-Bouldin
    private Double optimalDbi;
    private Double optimalSilhouette;
    private Double optimalCalinski;
    private Long totalCustomers;     // from cluster_result_aggregate (non-dormant)
    private List<KRow> perK;         // elbow data (ordered by k)

    public SegmentationModelPerfDto() {}

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public Integer getOptimalK() { return optimalK; }
    public void setOptimalK(Integer optimalK) { this.optimalK = optimalK; }
    public Double getOptimalDbi() { return optimalDbi; }
    public void setOptimalDbi(Double optimalDbi) { this.optimalDbi = optimalDbi; }
    public Double getOptimalSilhouette() { return optimalSilhouette; }
    public void setOptimalSilhouette(Double optimalSilhouette) { this.optimalSilhouette = optimalSilhouette; }
    public Double getOptimalCalinski() { return optimalCalinski; }
    public void setOptimalCalinski(Double optimalCalinski) { this.optimalCalinski = optimalCalinski; }
    public Long getTotalCustomers() { return totalCustomers; }
    public void setTotalCustomers(Long totalCustomers) { this.totalCustomers = totalCustomers; }
    public List<KRow> getPerK() { return perK; }
    public void setPerK(List<KRow> perK) { this.perK = perK; }
}
