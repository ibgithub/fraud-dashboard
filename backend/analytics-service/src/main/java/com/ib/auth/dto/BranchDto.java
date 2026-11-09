package com.ib.auth.dto;

/**
 * A bank branch from ods.m_branch — used to populate branch selectors
 * (e.g. the Pusat/Cabang scope picker in Role Management).
 */
public class BranchDto {
    private String code;
    private String name;

    public BranchDto() {}

    public BranchDto(String code, String name) {
        this.code = code;
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
