package com.ib.auth.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GeneratePassword {
    public static String generatePassword(String password){
        System.out.println(password);
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode(password);
        System.out.println(hash);
        return hash;
    }
    public static void main(String[] args) {
        generatePassword("merchant123");
    }
}
