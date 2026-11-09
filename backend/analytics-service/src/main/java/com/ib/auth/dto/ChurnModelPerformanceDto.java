package com.ib.auth.dto;

import java.util.List;

public class ChurnModelPerformanceDto {
    private String accuracy;
    private String precision;
    private String recall;
    private String missedRate;
    private String aucRoc;
    private String f1;
    private Integer totalAnalyzed;
    private List<ScoreRangeDto> scoreDistribution;

    // Confusion matrix (real counts from ml_eva.churn_confusion_matrix).
    private Long tp;   // churn -> churn
    private Long fp;   // bertahan -> churn
    private Long fn;   // churn -> bertahan
    private Long tn;   // bertahan -> bertahan

    // Model metadata (ml_eva.churn_model_info).
    private String modelName;
    private String modelLibrary;
    private String split;
    private Integer featureWindowMonths;
    private Integer outcomeWindowMonths;

    // Experiment comparison (ml_eva.model_experiment_comparison).
    private List<ModelCompareDto> modelComparison;

    public ChurnModelPerformanceDto() {}

    public String getF1() { return f1; }
    public void setF1(String f1) { this.f1 = f1; }

    public Long getTp() { return tp; }
    public void setTp(Long tp) { this.tp = tp; }
    public Long getFp() { return fp; }
    public void setFp(Long fp) { this.fp = fp; }
    public Long getFn() { return fn; }
    public void setFn(Long fn) { this.fn = fn; }
    public Long getTn() { return tn; }
    public void setTn(Long tn) { this.tn = tn; }

    public String getModelName() { return modelName; }
    public void setModelName(String modelName) { this.modelName = modelName; }
    public String getModelLibrary() { return modelLibrary; }
    public void setModelLibrary(String modelLibrary) { this.modelLibrary = modelLibrary; }
    public String getSplit() { return split; }
    public void setSplit(String split) { this.split = split; }
    public Integer getFeatureWindowMonths() { return featureWindowMonths; }
    public void setFeatureWindowMonths(Integer featureWindowMonths) { this.featureWindowMonths = featureWindowMonths; }
    public Integer getOutcomeWindowMonths() { return outcomeWindowMonths; }
    public void setOutcomeWindowMonths(Integer outcomeWindowMonths) { this.outcomeWindowMonths = outcomeWindowMonths; }

    public List<ModelCompareDto> getModelComparison() { return modelComparison; }
    public void setModelComparison(List<ModelCompareDto> modelComparison) { this.modelComparison = modelComparison; }

    /** One model row from ml_eva.model_experiment_comparison. */
    public static class ModelCompareDto {
        private String model;
        private Double auc;
        private Double f1;
        private Double precision;
        private Double recall;
        private Double accuracy;
        private boolean selected;

        public ModelCompareDto() {}
        public ModelCompareDto(String model, Double auc, Double f1, Double precision, Double recall, Double accuracy, boolean selected) {
            this.model = model; this.auc = auc; this.f1 = f1; this.precision = precision;
            this.recall = recall; this.accuracy = accuracy; this.selected = selected;
        }
        public String getModel() { return model; }
        public void setModel(String model) { this.model = model; }
        public Double getAuc() { return auc; }
        public void setAuc(Double auc) { this.auc = auc; }
        public Double getF1() { return f1; }
        public void setF1(Double f1) { this.f1 = f1; }
        public Double getPrecision() { return precision; }
        public void setPrecision(Double precision) { this.precision = precision; }
        public Double getRecall() { return recall; }
        public void setRecall(Double recall) { this.recall = recall; }
        public Double getAccuracy() { return accuracy; }
        public void setAccuracy(Double accuracy) { this.accuracy = accuracy; }
        public boolean isSelected() { return selected; }
        public void setSelected(boolean selected) { this.selected = selected; }
    }

    public String getAccuracy() { return accuracy; }
    public void setAccuracy(String accuracy) { this.accuracy = accuracy; }

    public String getPrecision() { return precision; }
    public void setPrecision(String precision) { this.precision = precision; }

    public String getRecall() { return recall; }
    public void setRecall(String recall) { this.recall = recall; }

    public String getMissedRate() { return missedRate; }
    public void setMissedRate(String missedRate) { this.missedRate = missedRate; }

    public String getAucRoc() { return aucRoc; }
    public void setAucRoc(String aucRoc) { this.aucRoc = aucRoc; }

    public Integer getTotalAnalyzed() { return totalAnalyzed; }
    public void setTotalAnalyzed(Integer totalAnalyzed) { this.totalAnalyzed = totalAnalyzed; }

    public List<ScoreRangeDto> getScoreDistribution() { return scoreDistribution; }
    public void setScoreDistribution(List<ScoreRangeDto> scoreDistribution) { this.scoreDistribution = scoreDistribution; }

    public static class ScoreRangeDto {
        private String range;
        private Integer count;

        public ScoreRangeDto() {}
        public ScoreRangeDto(String range, Integer count) {
            this.range = range;
            this.count = count;
        }

        public String getRange() { return range; }
        public void setRange(String range) { this.range = range; }

        public Integer getCount() { return count; }
        public void setCount(Integer count) { this.count = count; }
    }
}
