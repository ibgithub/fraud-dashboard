package com.ib.auth.dto;

import java.util.List;

public class CpiHotTargetDto {

    public static class CustomerItemDto {
        private String cif;
        private String name;
        private int churn;
        private String profit;
        private String value;
        private double rawValue;
        private String branch;
        private String cluster;
        private String action;

        public CustomerItemDto() {}

        public CustomerItemDto(String cif, String name, int churn, String profit, String value, double rawValue, String branch, String cluster, String action) {
            this.cif = cif;
            this.name = name;
            this.churn = churn;
            this.profit = profit;
            this.value = value;
            this.rawValue = rawValue;
            this.branch = branch;
            this.cluster = cluster;
            this.action = action;
        }

        public String getCif() { return cif; }
        public void setCif(String cif) { this.cif = cif; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public int getChurn() { return churn; }
        public void setChurn(int churn) { this.churn = churn; }

        public String getProfit() { return profit; }
        public void setProfit(String profit) { this.profit = profit; }

        public String getValue() { return value; }
        public void setValue(String value) { this.value = value; }

        public double getRawValue() { return rawValue; }
        public void setRawValue(double rawValue) { this.rawValue = rawValue; }

        public String getBranch() { return branch; }
        public void setBranch(String branch) { this.branch = branch; }

        public String getCluster() { return cluster; }
        public void setCluster(String cluster) { this.cluster = cluster; }

        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }
    }

    public static class ResponseDto {
        private int totalHotTarget;
        private String nilaiTerancam;
        private double rawNilaiTerancam;
        private int aksiTertunda;
        private double tertanganiPct;
        private List<CustomerItemDto> customers;
        private int totalElements;
        private int totalPages;
        private int currentPage;
        private int pageSize;

        public ResponseDto() {}

        public ResponseDto(int totalHotTarget, String nilaiTerancam, double rawNilaiTerancam, int aksiTertunda, double tertanganiPct, List<CustomerItemDto> customers, int totalElements, int totalPages, int currentPage, int pageSize) {
            this.totalHotTarget = totalHotTarget;
            this.nilaiTerancam = nilaiTerancam;
            this.rawNilaiTerancam = rawNilaiTerancam;
            this.aksiTertunda = aksiTertunda;
            this.tertanganiPct = tertanganiPct;
            this.customers = customers;
            this.totalElements = totalElements;
            this.totalPages = totalPages;
            this.currentPage = currentPage;
            this.pageSize = pageSize;
        }

        public int getTotalHotTarget() { return totalHotTarget; }
        public void setTotalHotTarget(int totalHotTarget) { this.totalHotTarget = totalHotTarget; }

        public String getNilaiTerancam() { return nilaiTerancam; }
        public void setNilaiTerancam(String nilaiTerancam) { this.nilaiTerancam = nilaiTerancam; }

        public double getRawNilaiTerancam() { return rawNilaiTerancam; }
        public void setRawNilaiTerancam(double rawNilaiTerancam) { this.rawNilaiTerancam = rawNilaiTerancam; }

        public int getAksiTertunda() { return aksiTertunda; }
        public void setAksiTertunda(int aksiTertunda) { this.aksiTertunda = aksiTertunda; }

        public double getTertanganiPct() { return tertanganiPct; }
        public void setTertanganiPct(double tertanganiPct) { this.tertanganiPct = tertanganiPct; }

        public List<CustomerItemDto> getCustomers() { return customers; }
        public void setCustomers(List<CustomerItemDto> customers) { this.customers = customers; }

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
