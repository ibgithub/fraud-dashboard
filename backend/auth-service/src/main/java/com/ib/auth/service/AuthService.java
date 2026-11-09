package com.ib.auth.service;

import com.ib.auth.dto.RoleDto;
import com.ib.auth.dto.SettingParameterDto;
import com.ib.auth.dto.UserDto;
import com.ib.auth.exception.AuthenticationException;
import com.ib.auth.repository.RoleRepository;
import com.ib.auth.repository.SettingParameterRepository;
import com.ib.auth.repository.UserRepository;
import com.ib.auth.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final SettingParameterRepository settingRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuditService auditService;

    public AuthService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       SettingParameterRepository settingRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.settingRepository = settingRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.auditService = auditService;
    }

    public String login(String username, String password) {
        return login(username, password, "web");
    }

    /**
     * Authenticate a user. {@code clientSource} identifies where the login came
     * from (e.g. "web" or "local-agent") and is recorded in the audit trail.
     */
    public String login(String username, String password, String clientSource) {
        String via = " (via " + (clientSource == null || clientSource.isBlank() ? "web" : clientSource) + ")";

        UserDto user = userRepository.findByUsername(username);

        if (user == null) {
            auditService.record(username, "LOGIN_FAILED", "AUTH", null,
                    "Failed login: unknown username '" + username + "'" + via);
            throw new AuthenticationException("auth.login.invalid_credentials");
        }

        // Cek apakah akun di-block (status = 2)
        if (user.getStatus() != null && user.getStatus() == 2) {
            auditService.record(username, "LOGIN_FAILED", "AUTH", String.valueOf(user.getId()),
                    "Failed login: account blocked" + via);
            throw new AuthenticationException("auth.account.blocked");
        }

        // Cek password
        if (!passwordEncoder.matches(password, user.getPassword())) {
            // Increment failed count
            userRepository.incrementLoginFailedCount(user.getId());

            // Cek apakah sudah melebihi batas
            int maxWrongPassword = getMaxWrongPassword();
            int currentFailed = (user.getLoginFailedCount() != null ? user.getLoginFailedCount() : 0) + 1;

            if (currentFailed >= maxWrongPassword) {
                // Block akun
                userRepository.updateStatus(user.getId(), 2);
                auditService.record(username, "USER_BLOCK", "USER", String.valueOf(user.getId()),
                        "Account auto-blocked after " + currentFailed + " failed login attempts" + via);
                throw new AuthenticationException("auth.account.blocked_max_attempts");
            }

            int remaining = maxWrongPassword - currentFailed;
            auditService.record(username, "LOGIN_FAILED", "AUTH", String.valueOf(user.getId()),
                    "Failed login: wrong password (" + remaining + " attempts remaining)" + via);
            throw new AuthenticationException(
                    "auth.login.invalid_credentials",
                    Map.of("remainingAttempts", remaining)
            );
        }

        // Login sukses — reset failed count
        if (user.getLoginFailedCount() != null && user.getLoginFailedCount() > 0) {
            userRepository.resetLoginFailedCount(user.getId());
        }

        // Ambil roles dari tabel user_roles
        List<RoleDto> userRoles = roleRepository.findRolesByUserId(user.getId());
        List<String> roleNames = userRoles.stream()
                .map(RoleDto::getRoleName)
                .toList();

        // PII privilege: user may view unmasked customer names if ANY of their
        // roles grants it (OR logic — safe for the multi-role case).
        boolean canViewCustomerName = userRoles.stream()
                .anyMatch(RoleDto::isCanViewCustomerName);

        auditService.record(user.getUsername(), "LOGIN", "AUTH", String.valueOf(user.getId()),
                "Login success" + via);

        return jwtUtil.generateToken(user, roleNames, canViewCustomerName);
    }

    private int getMaxWrongPassword() {
        try {
            SettingParameterDto param = settingRepository.findByName("MAX_WRONG_PASSWORD");
            if (param != null) {
                return Integer.parseInt(param.getValue());
            }
        } catch (Exception e) {
            // fallback
        }
        return 5; // default
    }
}
