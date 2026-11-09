package com.ib.auth.exception;

import java.util.Map;

public class AuthenticationException extends RuntimeException {
    private Map<String, Object> data;

    public AuthenticationException(String message) {
        super(message);
    }

    public AuthenticationException(String message, Map<String, Object> data) {
        super(message);
        this.data = data;
    }

    public Map<String, Object> getData() {
        return data;
    }
}
