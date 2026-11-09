package com.ib.auth.dto;

import java.util.List;

public class UserDto {
    private Long id;
    private String username;
    private String email;
    private String password;
    private String firstName;
    private String lastName;
    private String fullName;
    private String phoneNumber;
    private String appLang;
    private String appRowPerPage;
    private String appColPerPage;
    private String createdBy;
    private String updatedBy;
    private List<RoleDto> roles;
    private List<Long> roleIds;
    private Integer status;
    private Integer loginFailedCount;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public List<RoleDto> getRoles() {
        return roles;
    }

    public void setRoles(List<RoleDto> roles) {
        this.roles = roles;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getAppLang() {
        return appLang;
    }

    public void setAppLang(String appLang) {
        this.appLang = appLang;
    }

    public String getAppRowPerPage() {
        return appRowPerPage;
    }

    public void setAppRowPerPage(String appRowPerPage) {
        this.appRowPerPage = appRowPerPage;
    }

    public String getAppColPerPage() {
        return appColPerPage;
    }

    public void setAppColPerPage(String appColPerPage) {
        this.appColPerPage = appColPerPage;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

    public List<Long> getRoleIds() {
        return roleIds;
    }

    public void setRoleIds(List<Long> roleIds) {
        this.roleIds = roleIds;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public Integer getLoginFailedCount() {
        return loginFailedCount;
    }

    public void setLoginFailedCount(Integer loginFailedCount) {
        this.loginFailedCount = loginFailedCount;
    }
}
