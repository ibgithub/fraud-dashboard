package com.ib.auth.dto;

import java.util.List;

/**
 * DTOs for the "Setting Tindak Lanjut" (follow-up offer parameters) editor.
 */
public class FollowUpSettingDto {

    /** One editable parameter row. */
    public static class Item {
        private Long id;
        private String parameterName;
        private String value;
        private String unit;
        private int sortOrder;
        private Boolean isActive;
        private String createdDate;    // ISO date string yyyy-MM-dd
        private String executionDate;  // ISO date string yyyy-MM-dd (nullable)

        public Item() {}

        public Item(Long id, String parameterName, String value, String unit, int sortOrder,
                    Boolean isActive, String createdDate, String executionDate) {
            this.id = id;
            this.parameterName = parameterName;
            this.value = value;
            this.unit = unit;
            this.sortOrder = sortOrder;
            this.isActive = isActive;
            this.createdDate = createdDate;
            this.executionDate = executionDate;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getParameterName() { return parameterName; }
        public void setParameterName(String parameterName) { this.parameterName = parameterName; }

        public String getValue() { return value; }
        public void setValue(String value) { this.value = value; }

        public String getUnit() { return unit; }
        public void setUnit(String unit) { this.unit = unit; }

        public int getSortOrder() { return sortOrder; }
        public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean isActive) { this.isActive = isActive; }

        public String getCreatedDate() { return createdDate; }
        public void setCreatedDate(String createdDate) { this.createdDate = createdDate; }

        public String getExecutionDate() { return executionDate; }
        public void setExecutionDate(String executionDate) { this.executionDate = executionDate; }
    }

    /** Request body for saving/replacing the full set for a scope. */
    public static class SaveRequest {
        private String cluster;
        private String branch;      // null/blank => global (admin/HQ)
        private String cif;         // null/blank => cluster template; else per-customer
        private String executionDate; // shared execution date for the whole batch (optional)
        private List<Item> items;

        public SaveRequest() {}

        public String getCluster() { return cluster; }
        public void setCluster(String cluster) { this.cluster = cluster; }

        public String getBranch() { return branch; }
        public void setBranch(String branch) { this.branch = branch; }

        public String getCif() { return cif; }
        public void setCif(String cif) { this.cif = cif; }

        public String getExecutionDate() { return executionDate; }
        public void setExecutionDate(String executionDate) { this.executionDate = executionDate; }

        public List<Item> getItems() { return items; }
        public void setItems(List<Item> items) { this.items = items; }
    }
}
