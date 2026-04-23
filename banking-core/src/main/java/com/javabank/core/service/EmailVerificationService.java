package com.javabank.core.service;

import com.javabank.core.entity.EmailVerificationCode;
import com.javabank.core.repository.EmailVerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailVerificationService {

    private final EmailVerificationRepository verificationRepository;
    private final JavaMailSender mailSender;

    private static final int CODE_LENGTH = 6;
    private static final int CODE_EXPIRY_MINUTES = 10;

    /**
     * Generate a 6-digit verification code, persist it, and send it to the user's email.
     */
    @Transactional
    public void sendVerificationCode(String email) {
        String code = generateCode();

        EmailVerificationCode verification = EmailVerificationCode.builder()
                .email(email)
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(CODE_EXPIRY_MINUTES))
                .build();

        verificationRepository.save(verification);

        sendEmail(email, code);
        log.info("Verification code sent to {}", email);
    }

    /**
     * Verify the 6-digit code against the stored code for the given email.
     * Returns true if valid and not expired. Marks as verified on success.
     */
    @Transactional
    public boolean verifyCode(String email, String code) {
        EmailVerificationCode verification = verificationRepository
                .findTopByEmailAndVerifiedFalseOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No verification code found for this email. Please request a new one."));

        if (verification.isExpired()) {
            throw new IllegalArgumentException("Verification code has expired. Please request a new one.");
        }

        if (!verification.getCode().equals(code)) {
            throw new IllegalArgumentException("Invalid verification code.");
        }

        verification.setVerified(true);
        verificationRepository.save(verification);
        return true;
    }

    /**
     * Check if the email has been verified (has a verified, non-expired code).
     */
    public boolean isEmailVerified(String email) {
        return verificationRepository
                .findTopByEmailAndVerifiedFalseOrderByCreatedAtDesc(email)
                .isEmpty() &&
                verificationRepository.findTopByEmailAndVerifiedFalseOrderByCreatedAtDesc(email).isEmpty();
    }

    /**
     * Check if a verified code exists for the given email.
     */
    @Transactional(readOnly = true)
    public boolean hasVerifiedCode(String email) {
        // We need a custom check — look for any verified code for this email
        return verificationRepository.findAll().stream()
                .anyMatch(v -> v.getEmail().equals(email) && v.isVerified() && !v.isExpired());
    }

    /**
     * Clean up verification codes for the email after successful registration.
     */
    @Transactional
    public void cleanupCodes(String email) {
        verificationRepository.deleteByEmail(email);
    }

    private String generateCode() {
        SecureRandom random = new SecureRandom();
        int code = random.nextInt((int) Math.pow(10, CODE_LENGTH));
        return String.format("%0" + CODE_LENGTH + "d", code);
    }

    private void sendEmail(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("JavaBank - Email Verification Code");
        message.setText(String.format(
                "Welcome to JavaBank!\n\n" +
                "Your email verification code is: %s\n\n" +
                "This code will expire in %d minutes.\n\n" +
                "If you did not request this code, please ignore this email.\n\n" +
                "— JavaBank Team",
                code, CODE_EXPIRY_MINUTES
        ));

        try {
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", to, e.getMessage());
            throw new RuntimeException("Failed to send verification email. Please try again later.");
        }
    }
}
