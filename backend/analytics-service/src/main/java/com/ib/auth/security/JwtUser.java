package com.ib.auth.security;

import java.util.List;

public class JwtUser {

    private Long userId;
    private String username;
    private String role;           // backward compatible (role pertama)
    private List<String> roles;    // semua role
    private boolean canViewCustomerName; // PII privilege from JWT claim

    public JwtUser(Long userId, String username, String role) {
        this.userId = userId;
        this.username = username;
        this.role = role;
        this.roles = List.of(role);
    }

    public JwtUser(Long userId, String username, List<String> roles) {
        this.userId = userId;
        this.username = username;
        this.roles = roles;
        this.role = roles.isEmpty() ? null : roles.get(0);
    }

    public Long getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    public String getRole() {
        return role;
    }

    public List<String> getRoles() {
        return roles;
    }

    public boolean isCanViewCustomerName() {
        return canViewCustomerName;
    }

    public void setCanViewCustomerName(boolean canViewCustomerName) {
        this.canViewCustomerName = canViewCustomerName;
    }
}
