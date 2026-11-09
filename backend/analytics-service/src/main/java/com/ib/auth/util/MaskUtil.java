package com.ib.auth.util;

import com.ib.auth.security.JwtUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Masking helpers for personally identifiable information (PII) shown in the UI.
 * Masking is applied in the backend so raw values never reach the browser.
 * A role may be granted the privilege to view unmasked names (JWT claim
 * canViewCustomerName); when present, maskName returns the raw value.
 */
public final class MaskUtil {

    private MaskUtil() {}

    /**
     * Whether the current authenticated user is allowed to see unmasked
     * customer names (from the JWT "canViewCustomerName" claim). Defaults to
     * false (mask) when there is no authenticated principal.
     */
    private static boolean currentUserCanViewName() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof JwtUser ju) {
                return ju.isCanViewCustomerName();
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    /**
     * Mask a customer name keeping only the first letter of each word; the rest
     * of each word becomes '*'. The number of stars per word is capped at 3, so
     * a word with 4 or more characters shows just the first letter + 3 stars.
     * Multiple spaces collapse to a single space. Examples:
     *   "Prasetyo Simbolon" -> "P*** S***"
     *   "Rizki Panjaitan"   -> "R*** P***"
     *   "Ali"               -> "A**"
     *   "A"                 -> "A"
     * Null/blank input is returned unchanged. If the current user's role grants
     * the view-customer-name privilege, the raw name is returned unchanged.
     */
    private static final int MAX_STARS = 3;

    public static String maskName(String name) {
        if (name == null || name.isBlank()) {
            return name;
        }
        // Role-based override: privileged users see the real name.
        if (currentUserCanViewName()) {
            return name;
        }
        String[] words = name.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (int w = 0; w < words.length; w++) {
            if (w > 0) sb.append(' ');
            String word = words[w];
            sb.append(word.charAt(0));
            int stars = Math.min(word.length() - 1, MAX_STARS);
            for (int i = 0; i < stars; i++) {
                sb.append('*');
            }
        }
        return sb.toString();
    }
}
