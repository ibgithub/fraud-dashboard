package com.ib.auth.dto;

import java.util.List;

public class RecommendationHistoryDto {

    public static class RecordDto {
        private String cif;
        private String customerName;
        private String branch;
        private double aum;              // raw AUM in IDR
        private String segmentation;     // persona_name
        private String recommendationType; // "product" | "non-product"
        private String recommendationName;
        private String offeredProduct;   // concrete product accepted, e.g. "DEPOSITO BERJANGKA" (product recs only)
        private String offeredRate;      // rate offered, e.g. "6%" (product recs only)
        private String status;           // sent | accepted | approved | rejected
        private String matrixCluster;    // e.g. "C9 - Burning Bridge"
        private String sentDate;
        private String acceptedDate;
        private String approvedDate;
        private String rejectedDate;

        public RecordDto() {}

        public String getCif() { return cif; }
        public void setCif(String cif) { this.cif = cif; }
        public String getCustomerName() { return customerName; }
        public void setCustomerName(String customerName) { this.customerName = customerName; }
        public String getBranch() { return branch; }
        public void setBranch(String branch) { this.branch = branch; }
        public double getAum() { return aum; }
        public void setAum(double aum) { this.aum = aum; }
        public String getSegmentation() { return segmentation; }
        public void setSegmentation(String segmentation) { this.segmentation = segmentation; }
        public String getRecommendationType() { return recommendationType; }
        public void setRecommendationType(String recommendationType) { this.recommendationType = recommendationType; }
        public String getRecommendationName() { return recommendationName; }
        public void setRecommendationName(String recommendationName) { this.recommendationName = recommendationName; }
        public String getOfferedProduct() { return offeredProduct; }
        public void setOfferedProduct(String offeredProduct) { this.offeredProduct = offeredProduct; }
        public String getOfferedRate() { return offeredRate; }
        public void setOfferedRate(String offeredRate) { this.offeredRate = offeredRate; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getMatrixCluster() { return matrixCluster; }
        public void setMatrixCluster(String matrixCluster) { this.matrixCluster = matrixCluster; }
        public String getSentDate() { return sentDate; }
        public void setSentDate(String sentDate) { this.sentDate = sentDate; }
        public String getAcceptedDate() { return acceptedDate; }
        public void setAcceptedDate(String acceptedDate) { this.acceptedDate = acceptedDate; }
        public String getApprovedDate() { return approvedDate; }
        public void setApprovedDate(String approvedDate) { this.approvedDate = approvedDate; }
        public String getRejectedDate() { return rejectedDate; }
        public void setRejectedDate(String rejectedDate) { this.rejectedDate = rejectedDate; }
    }

    public static class ResponseDto {
        private List<RecordDto> records;
        private int totalElements;
        private int totalPages;
        private int currentPage;
        private int pageSize;
        // Summary stats (across the whole filtered set, not just current page)
        private int totalSent;
        private int totalApproved;
        private int totalRejected;
        private double approvalRate;

        public ResponseDto() {}

        public List<RecordDto> getRecords() { return records; }
        public void setRecords(List<RecordDto> records) { this.records = records; }
        public int getTotalElements() { return totalElements; }
        public void setTotalElements(int totalElements) { this.totalElements = totalElements; }
        public int getTotalPages() { return totalPages; }
        public void setTotalPages(int totalPages) { this.totalPages = totalPages; }
        public int getCurrentPage() { return currentPage; }
        public void setCurrentPage(int currentPage) { this.currentPage = currentPage; }
        public int getPageSize() { return pageSize; }
        public void setPageSize(int pageSize) { this.pageSize = pageSize; }
        public int getTotalSent() { return totalSent; }
        public void setTotalSent(int totalSent) { this.totalSent = totalSent; }
        public int getTotalApproved() { return totalApproved; }
        public void setTotalApproved(int totalApproved) { this.totalApproved = totalApproved; }
        public int getTotalRejected() { return totalRejected; }
        public void setTotalRejected(int totalRejected) { this.totalRejected = totalRejected; }
        public double getApprovalRate() { return approvalRate; }
        public void setApprovalRate(double approvalRate) { this.approvalRate = approvalRate; }
    }
}
