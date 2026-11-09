package com.ib.auth.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();

        return path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/api-docs")
                || path.equals("/swagger")
                || path.startsWith("/swagger/");
    }

    @Override
    @SuppressWarnings("unchecked")
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            Claims claims = jwtUtil.validateToken(token);
            String username = claims.getSubject();
            Long userId = claims.get("userId", Long.class);

            // Ambil roles dari token
            List<String> roles;
            Object rolesObj = claims.get("roles");
            if (rolesObj instanceof List) {
                roles = (List<String>) rolesObj;
            } else {
                String singleRole = claims.get("role", String.class);
                roles = singleRole != null ? List.of(singleRole) : List.of();
            }

            // Build authorities: ROLE_xxx untuk setiap role
            List<SimpleGrantedAuthority> authorities = new ArrayList<>();
            for (String role : roles) {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
            }

            JwtUser jwtUser = new JwtUser(userId, username, roles);

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            jwtUser,
                            null,
                            authorities
                    );

            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (Exception e) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
