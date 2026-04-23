package com.javabank.core.repository;

import com.javabank.core.entity.EmailVerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerificationCode, Long> {
    Optional<EmailVerificationCode> findTopByEmailAndVerifiedFalseOrderByCreatedAtDesc(String email);
    void deleteByEmail(String email);
}
