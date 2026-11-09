package com.ib.auth.dto;

import java.util.List;

public class ChurnRankingDto {
    private List<ChurnCustomerItem> items;
    private Integer page;
    private Integer size;
    private Long totalElements;
    private Integer totalPages;

    public ChurnRankingDto() {}

    public ChurnRankingDto(List<ChurnCustomerItem> items, Integer page, Integer size, Long totalElements, Integer totalPages) {
        this.items = items;
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
    }

    public List<ChurnCustomerItem> getItems() { return items; }
    public void setItems(List<ChurnCustomerItem> items) { this.items = items; }

    public Integer getPage() { return page; }
    public void setPage(Integer page) { this.page = page; }

    public Integer getSize() { return size; }
    public void setSize(Integer size) { this.size = size; }

    public Long getTotalElements() { return totalElements; }
    public void setTotalElements(Long totalElements) { this.totalElements = totalElements; }

    public Integer getTotalPages() { return totalPages; }
    public void setTotalPages(Integer totalPages) { this.totalPages = totalPages; }

    public static class ChurnCustomerItem {
        private Integer rank;
        private String id;
        private String name;
        private String branch;
        private Double churnIndex;
        private String tier;
        private Double totalBalance;
        private String occupation;

        public ChurnCustomerItem() {}

        public ChurnCustomerItem(Integer rank, String id, String name, String branch, Double churnIndex, String tier, Double totalBalance, String occupation) {
            this.rank = rank;
            this.id = id;
            this.name = name;
            this.branch = branch;
            this.churnIndex = churnIndex;
            this.tier = tier;
            this.totalBalance = totalBalance;
            this.occupation = occupation;
        }

        public Integer getRank() { return rank; }
        public void setRank(Integer rank) { this.rank = rank; }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getBranch() { return branch; }
        public void setBranch(String branch) { this.branch = branch; }

        public Double getChurnIndex() { return churnIndex; }
        public void setChurnIndex(Double churnIndex) { this.churnIndex = churnIndex; }

        public String getTier() { return tier; }
        public void setTier(String tier) { this.tier = tier; }

        public Double getTotalBalance() { return totalBalance; }
        public void setTotalBalance(Double totalBalance) { this.totalBalance = totalBalance; }

        public String getOccupation() { return occupation; }
        public void setOccupation(String occupation) { this.occupation = occupation; }
    }
}
