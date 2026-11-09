package com.ib.auth.service;

import com.ib.auth.common.PageResult;
import com.ib.auth.dto.ChangePasswordDto;
import com.ib.auth.dto.RoleDto;
import com.ib.auth.dto.UserDto;
import com.ib.auth.repository.RoleRepository;
import com.ib.auth.repository.UserRepository;
import com.ib.auth.security.JwtUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(UserRepository userRepository, RoleRepository roleRepository,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
        this.auditService = auditService;
    }

    // Resolve the current acting username from the security context (fallback "system").
    private String currentActor() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                return auth.getName();
            }
        } catch (Exception ignored) {
        }
        return "system";
    }

    public void createUser(UserDto request, JwtUser loginUser) {

        // 🔐 bcrypt password
        request.setPassword(
                passwordEncoder.encode(request.getPassword())
        );

        request.setCreatedBy(loginUser.getUsername());

        // Default bahasa Indonesia kalau tidak diisi
        if (request.getAppLang() == null || request.getAppLang().isBlank()) {
            request.setAppLang("ID");
        }

        userRepository.insert(request);

        auditService.record(loginUser.getUsername(), "USER_CREATE", "USER", null,
                "Created user '" + request.getUsername() + "'");
    }
    public void updateUser(
            UserDto request,
            JwtUser loginUser
    ) {
        request.setUpdatedBy(loginUser.getUsername());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            request.setPassword(
                    passwordEncoder.encode(request.getPassword())
            );
        } else {
            request.setPassword(null); // tanda: tidak update
        }

        userRepository.update(request);

        // Update roles kalau roleIds dikirim
        if (request.getRoleIds() != null) {
            roleRepository.deleteUserRoles(request.getId());
            for (Long roleId : request.getRoleIds()) {
                roleRepository.insertUserRole(request.getId(), roleId, loginUser.getUsername());
            }
        }

        auditService.record(loginUser.getUsername(), "USER_UPDATE", "USER",
                String.valueOf(request.getId()),
                "Updated user (id=" + request.getId() + ")");
    }
    public UserDto getMyProfile(JwtUser loginUser) {
        UserDto user = userRepository.findProfileById(loginUser.getUserId());
        if (user != null) {
            user.setRoles(roleRepository.findRolesByUserId(user.getId()));
        }
        return user;
    }

    public void updateMyProfile(UserDto request) {
        request.setPassword(null);
        userRepository.update(request);
    }

    public List<UserDto> getUsers() {
        return userRepository.findAll();
    }

    public PageResult<UserDto> findPaged(int page, int size, String keyword) {

        int offset = page * size;

        List<UserDto> users = userRepository.findAll(size, offset, keyword);
        int total = userRepository.countAll(keyword);

        // Populate roles untuk setiap user
        for (UserDto user : users) {
            List<RoleDto> roles = roleRepository.findRolesByUserId(user.getId());
            user.setRoles(roles);
        }

        return new PageResult<>(users, page, size, total);
    }

    public UserDto getById(Long id) {
        UserDto user = userRepository.findProfileById(id);
        if (user != null) {
            user.setRoles(roleRepository.findRolesByUserId(user.getId()));
        }
        return user;
    }
    public void changePasswordSelf(Long userId, ChangePasswordDto dto) {

        UserDto user = getById(userId);

        if (!passwordEncoder.matches(dto.getOldPassword(), user.getPassword())) {
            throw new RuntimeException("user.old_password_wrong");
        }

        validateNewPassword(dto);

        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        userRepository.update(user);

        auditService.record(user.getUsername(), "PASSWORD_CHANGE", "USER", String.valueOf(userId),
                "User changed own password");
    }

    public void changePasswordByAdmin(Long userId, ChangePasswordDto dto) {

        validateNewPassword(dto);

        UserDto user = getById(userId);
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        userRepository.update(user);

        auditService.record(currentActor(), "PASSWORD_RESET", "USER", String.valueOf(userId),
                "Admin reset password for user '" + user.getUsername() + "'");
    }
    private void validateNewPassword(ChangePasswordDto dto) {
        if (!dto.getNewPassword().equals(dto.getConfirmPassword())) {
            throw new RuntimeException("user.password_mismatch");
        }
    }

    public void deleteUser(Long id) {
        UserDto user = userRepository.findProfileById(id);
        if (user == null) {
            throw new RuntimeException("user.not_found");
        }
        userRepository.deleteById(id);

        auditService.record(currentActor(), "USER_DELETE", "USER", String.valueOf(id),
                "Deleted user '" + user.getUsername() + "'");
    }

    public void unlockUser(Long id) {
        UserDto user = userRepository.findProfileById(id);
        if (user == null) {
            throw new RuntimeException("user.not_found");
        }
        userRepository.updateStatus(id, 1); // ACTIVE
        userRepository.resetLoginFailedCount(id);

        auditService.record(currentActor(), "USER_UNLOCK", "USER", String.valueOf(id),
                "Unlocked user '" + user.getUsername() + "'");
    }

    public void blockUser(Long id) {
        UserDto user = userRepository.findProfileById(id);
        if (user == null) {
            throw new RuntimeException("user.not_found");
        }
        userRepository.updateStatus(id, 2); // BLOCKED

        auditService.record(currentActor(), "USER_BLOCK", "USER", String.valueOf(id),
                "Blocked user '" + user.getUsername() + "'");
    }
}
