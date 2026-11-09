package com.ib.auth.dto;

public class AgeDistributionDto {
    private String ageRange;
    private int nasabahCount;

    public AgeDistributionDto() {}

    public AgeDistributionDto(String ageRange, int nasabahCount) {
        this.ageRange = ageRange;
        this.nasabahCount = nasabahCount;
    }

    public String getAgeRange() {
        return ageRange;
    }

    public void setAgeRange(String ageRange) {
        this.ageRange = ageRange;
    }

    public int getNasabahCount() {
        return nasabahCount;
    }

    public void setNasabahCount(int nasabahCount) {
        this.nasabahCount = nasabahCount;
    }
}
