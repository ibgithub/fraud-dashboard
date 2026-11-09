package com.ib.auth.config;


import com.ib.auth.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
public class SecurityConfig {
    private static final String[] SWAGGER_WHITELIST = {
            "/swagger-ui.html",
            "/swagger-ui/**",
            "/v3/api-docs/**",
            "/v3/api-docs",
            "/api-docs/**",
            "/api-docs",
            "/swagger",
            "/swagger/**"
    };

    @Value("${cors.allowed-origins:*}")
    private String allowedOrigins;

    private final JwtAuthenticationFilter jwtFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(SWAGGER_WHITELIST).permitAll()
                        // Actuator endpoints are scraped by Spring Boot Admin over the
                        // internal cluster network. The ALB ingress never routes /actuator,
                        // so these are not reachable from the public internet.
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/api/auth/login", "/api/auth/login/**").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Endpoint yang bisa diakses semua user yang login
                        .requestMatchers("/api/users/me").authenticated()
                        .requestMatchers("/api/users/me/menus").authenticated()
                        .requestMatchers("/api/users/me/roles").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/users/me/password").authenticated()

                        // Role & Menu management - hanya ADMIN
                        .requestMatchers("/api/roles/**").hasRole("ADMIN")
                        .requestMatchers("/api/permissions/**").hasRole("ADMIN")
                        .requestMatchers("/api/menus/**").hasRole("ADMIN")
                        .requestMatchers("/api/settings/**").hasRole("ADMIN")
                        .requestMatchers("/api/audit-logs/**").hasRole("ADMIN")

                        // User management - hanya ADMIN
                        .requestMatchers(HttpMethod.GET, "/api/users").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/users").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/users/{id}").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/users/*/unlock").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/users/*/block").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/users/*/roles").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/users/*/roles").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/users/*/password").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/users/{id}").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/users/{id}").hasRole("ADMIN")

                        .anyRequest().authenticated()
                )
                .sessionManagement(sm ->
                        sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                // Unauthenticated requests (missing/invalid/expired JWT) return 401 so the
                // frontend redirects to login. Authenticated-but-forbidden (e.g. non-admin
                // hitting /api/roles) still returns 403 via the default AccessDeniedHandler.
                .exceptionHandling(ex -> ex.authenticationEntryPoint(restAuthEntryPoint()))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationEntryPoint restAuthEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // 401
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"success\":false,\"code\":\"UNAUTHORIZED\",\"message\":\"Session expired or invalid token\"}"
            );
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept"));
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config
    ) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}

