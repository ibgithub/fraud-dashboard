package com.ib.auth.controller;

import com.ib.auth.common.ApiResponse;
import com.ib.auth.dto.JwtResponse;
import com.ib.auth.entity.LoginRequest;
import com.ib.auth.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtResponse>> login(
            @RequestBody LoginRequest request,
            @RequestHeader(value = "X-Client", required = false) String client) {
        String token = authService.login(
                request.getUsername(),
                request.getPassword(),
                normalizeClient(client)
        );
        JwtResponse jwt = new JwtResponse(token);
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "auth.login.success", jwt));
    }

    /**
     * Normalize the X-Client header into a short, safe source label for audit.
     * Defaults to "web" when the header is missing (the web app does not send it).
     */
    private String normalizeClient(String client) {
        if (client == null || client.isBlank()) {
            return "web";
        }
        String c = client.trim().toLowerCase();
        if (c.equals("local-agent")) {
            return "local-agent";
        }
        // Keep it short and avoid log/audit injection from arbitrary header values.
        c = c.replaceAll("[^a-z0-9_-]", "");
        if (c.length() > 30) {
            c = c.substring(0, 30);
        }
        return c.isEmpty() ? "web" : c;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> me(Authentication authentication) {
        Map<String, Object> data = Map.of(
                "username", authentication.getName(),
                "authorities", authentication.getAuthorities()
        );
        return ResponseEntity.ok(new ApiResponse<>(true, "SUCCESS", "auth.me.success", data));
    }
}
