package com.ib.auth.dto;

import java.util.List;

public class RoleDto {
    private Long id;
    private String roleName;
    private String description;
    private boolean canViewCustomerName;
    private String scopeType;   // 'PUSAT' or 'CABANG'
    private String branchCode;  // non-null when scopeType = 'CABANG'
    private List<MenuDto> menus;
    private List<Long> menuIds;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRoleName() {
        return roleName;
    }

    public void setRoleName(String roleName) {
        this.roleName = roleName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isCanViewCustomerName() {
        return canViewCustomerName;
    }

    public void setCanViewCustomerName(boolean canViewCustomerName) {
        this.canViewCustomerName = canViewCustomerName;
    }

    public String getScopeType() {
        return scopeType;
    }

    public void setScopeType(String scopeType) {
        this.scopeType = scopeType;
    }

    public String getBranchCode() {
        return branchCode;
    }

    public void setBranchCode(String branchCode) {
        this.branchCode = branchCode;
    }

    public List<MenuDto> getMenus() {
        return menus;
    }

    public void setMenus(List<MenuDto> menus) {
        this.menus = menus;
    }

    public List<Long> getMenuIds() {
        return menuIds;
    }

    public void setMenuIds(List<Long> menuIds) {
        this.menuIds = menuIds;
    }
}
