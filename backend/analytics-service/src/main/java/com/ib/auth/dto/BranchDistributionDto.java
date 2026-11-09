package com.ib.auth.dto;

public class BranchDistributionDto {
    private String branchName;
    private int nasabahCount;

    public BranchDistributionDto() {}

    public BranchDistributionDto(String branchName, int nasabahCount) {
        this.branchName = branchName;
        this.nasabahCount = nasabahCount;
    }

    public String getBranchName() {
        return branchName;
    }

    public void setBranchName(String branchName) {
        this.branchName = branchName;
    }

    public int getNasabahCount() {
        return nasabahCount;
    }

    public void setNasabahCount(int nasabahCount) {
        this.nasabahCount = nasabahCount;
    }
}
