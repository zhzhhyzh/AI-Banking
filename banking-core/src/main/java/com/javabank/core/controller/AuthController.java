package com.javabank.core.controller;

import com.javabank.core.dto.*;
import com.javabank.core.entity.User;
import com.javabank.core.security.JwtTokenProvider;
import com.javabank.core.service.AuditService;
import com.javabank.core.service.EmailVerificationService;
import com.javabank.core.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final EmailVerificationService emailVerificationService;

    @PostMapping("/send-verification")
    public ResponseEntity<Map<String, String>> sendVerification(
            @Valid @RequestBody SendVerificationRequest request) {
        // Check if email is already registered
        if (userService.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        emailVerificationService.sendVerificationCode(request.getEmail());
        return ResponseEntity.ok(Map.of(
                "message", "Verification code sent to " + request.getEmail(),
                "email", request.getEmail()
        ));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, Object>> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest request) {
        emailVerificationService.verifyCode(request.getEmail(), request.getCode());
        return ResponseEntity.ok(Map.of(
                "verified", true,
                "email", request.getEmail(),
                "message", "Email verified successfully"
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        // Ensure email has been verified before allowing registration
        if (!emailVerificationService.hasVerifiedCode(request.getEmail())) {
            throw new IllegalArgumentException(
                    "Email not verified. Please verify your email before registering.");
        }

        User user = userService.register(request);
        String token = jwtTokenProvider.generateToken(user.getUsername(), user.getId());

        // Clean up verification codes after successful registration
        emailVerificationService.cleanupCodes(request.getEmail());

        auditService.logAction(user.getId(), "USER_REGISTERED", "New user registration",
                "User " + user.getUsername() + " registered successfully (email verified)");

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .userId(user.getId())
                .build());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        User user = userService.findByUsername(request.getUsername());

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(401).build();
        }

        String token = jwtTokenProvider.generateToken(user.getUsername(), user.getId());

        auditService.logAction(user.getId(), "USER_LOGIN", "User login",
                "User " + user.getUsername() + " logged in");

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .userId(user.getId())
                .build());
    }
}
