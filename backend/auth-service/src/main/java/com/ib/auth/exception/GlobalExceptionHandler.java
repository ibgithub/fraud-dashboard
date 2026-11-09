package com.ib.auth.exception;

import com.ib.auth.common.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.ib.auth.controller")
public class GlobalExceptionHandler {

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Object>> handleAuthenticationException(
            AuthenticationException ex) {
        ApiResponse<Object> response = new ApiResponse<>(
            false, "UNAUTHORIZED", ex.getMessage(), ex.getData()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(
            AccessDeniedException ex) {
        ApiResponse<Void> response = new ApiResponse<>(
            false, "FORBIDDEN", "auth.access_denied", null
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse<Void>> handleRuntimeException(RuntimeException ex) {
        // Business logic errors (role sudah ada, permission tidak ditemukan, dll)
        ApiResponse<Void> response = new ApiResponse<>(
            false, "BAD_REQUEST", ex.getMessage(), null
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        ApiResponse<Void> response = new ApiResponse<>(
            false, "INTERNAL_ERROR", "error.internal", null
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
