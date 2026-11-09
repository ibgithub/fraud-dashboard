package com.ib.adminserver;

import de.codecentric.boot.admin.server.config.AdminServerProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

/**
 * Secures the Spring Boot Admin UI with form login.
 *
 * - Humans log in through the SBA login page (user/password below).
 * - Registered client apps (auth-service, analytics-service) POST to
 *   /instances and send actuator data; those endpoints use HTTP Basic with the
 *   same credentials and are exempt from CSRF.
 */
@Configuration
public class SecurityConfig {

    private final String adminContextPath;

    public SecurityConfig(AdminServerProperties adminServerProperties) {
        this.adminContextPath = adminServerProperties.getContextPath();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        SavedRequestAwareAuthenticationSuccessHandler successHandler =
                new SavedRequestAwareAuthenticationSuccessHandler();
        successHandler.setTargetUrlParameter("redirectTo");
        successHandler.setDefaultTargetUrl(this.adminContextPath + "/");

        http
                .authorizeHttpRequests(auth -> auth
                        // Static assets + the login page itself are public.
                        .requestMatchers(this.adminContextPath + "/assets/**").permitAll()
                        .requestMatchers(this.adminContextPath + "/login").permitAll()
                        // Health endpoint must be reachable unauthenticated for the
                        // Kubernetes liveness/readiness/startup probes.
                        .requestMatchers(this.adminContextPath + "/actuator/health",
                                this.adminContextPath + "/actuator/health/**").permitAll()
                        // Everything else requires an authenticated session.
                        .anyRequest().authenticated()
                )
                .formLogin(form -> form
                        .loginPage(this.adminContextPath + "/login")
                        .successHandler(successHandler)
                )
                .logout(logout -> logout.logoutUrl(this.adminContextPath + "/logout"))
                .httpBasic(Customizer.withDefaults())
                // Client registration + actuator notifications must bypass CSRF.
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .ignoringRequestMatchers(
                                new AntPathRequestMatcher(this.adminContextPath + "/instances", "POST"),
                                new AntPathRequestMatcher(this.adminContextPath + "/instances/*", "DELETE"),
                                new AntPathRequestMatcher(this.adminContextPath + "/actuator/**")
                        ));

        return http.build();
    }

    @Bean
    public UserDetailsService userDetailsService(
            PasswordEncoder encoder,
            @Value("${admin.security.user:admin}") String user,
            @Value("${admin.security.password:admin}") String password) {
        UserDetails admin = User.withUsername(user)
                .password(encoder.encode(password))
                .roles("ADMIN")
                .build();
        return new InMemoryUserDetailsManager(admin);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
