package com.ib.auth.dto;

public class GenderDistributionDto {
    private String gender;
    private int nasabahCount;

    public GenderDistributionDto() {}

    public GenderDistributionDto(String gender, int nasabahCount) {
        this.gender = gender;
        this.nasabahCount = nasabahCount;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public int getNasabahCount() {
        return nasabahCount;
    }

    public void setNasabahCount(int nasabahCount) {
        this.nasabahCount = nasabahCount;
    }
}
