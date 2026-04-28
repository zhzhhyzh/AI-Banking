package com.javabank.core.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Date;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expirationMs;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(resolveKeyBytes(secret));
        this.expirationMs = expirationMs;
    }

    /**
     * Accepts either a Base64-encoded secret or a plain string.
     * Ensures the resulting key is at least 256 bits (HS256 requirement)
     * by SHA-256 hashing short inputs.
     */
    private static byte[] resolveKeyBytes(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("app.jwt.secret must be configured");
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException ex) {
            bytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        if (bytes.length < 32) {
            try {
                bytes = MessageDigest.getInstance("SHA-256")
                        .digest(secret.getBytes(StandardCharsets.UTF_8));
            } catch (NoSuchAlgorithmException e) {
                throw new IllegalStateException("SHA-256 not available", e);
            }
        }
        return bytes;
    }

    public String generateToken(String username, Long userId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(username)
                .claim("userId", userId)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        return getClaims(token).getPayload().getSubject();
    }

    public Long getUserIdFromToken(String token) {
        return getClaims(token).getPayload().get("userId", Long.class);
    }

    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Jws<Claims> getClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token);
    }
}
