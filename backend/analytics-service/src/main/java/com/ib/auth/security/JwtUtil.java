package com.ib.auth.security;

import com.ib.auth.dto.UserDto;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Generate token dengan multiple roles.
     * Claim "roles" berisi array, claim "role" berisi role pertama (backward compatible).
     */
    public String generateToken(UserDto user, List<String> roles) {
        String firstRole = roles.isEmpty() ? "" : roles.get(0);
        String lang = user.getAppLang() != null ? user.getAppLang() : "ID";

        return Jwts.builder()
                .setSubject(user.getUsername())
                .claim("userId", user.getId())
                .claim("role", firstRole)       // backward compatible
                .claim("roles", roles)           // array of roles
                .claim("appLang", lang)          // bahasa user
                .setIssuedAt(new Date())
                .setExpiration(
                        new Date(System.currentTimeMillis() + expiration)
                )
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
    /**
     * Generate token dengan single role (backward compatible).
     */
    public String generateToken(UserDto user) {
        return generateToken(user, List.of());
    }

    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
