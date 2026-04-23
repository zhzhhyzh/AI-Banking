package com.javabank.core.service;

import com.javabank.core.dto.TransactionResponse;
import com.javabank.core.dto.TransferRequest;
import com.javabank.core.entity.*;
import com.javabank.core.repository.AccountRepository;
import com.javabank.core.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final AuditService auditService;

    @Transactional
    public TransactionResponse initiateTransfer(Long userId, TransferRequest request) {
        Account fromAccount = accountRepository.findById(request.getFromAccountId())
                .orElseThrow(() -> new IllegalArgumentException("Source account not found"));
        Account toAccount = accountRepository.findById(request.getToAccountId())
                .orElseThrow(() -> new IllegalArgumentException("Destination account not found"));

        // Verify the source account belongs to the user
        if (!fromAccount.getUser().getId().equals(userId)) {
            throw new SecurityException("You do not own the source account");
        }

        // Validate sufficient balance
        if (fromAccount.getBalance().compareTo(request.getAmount()) < 0) {
            throw new IllegalArgumentException("Insufficient balance. Available: " + fromAccount.getBalance());
        }

        // Determine initial status based on risk
        TransactionStatus initialStatus = TransactionStatus.PENDING;
        if ("HIGH".equalsIgnoreCase(request.getRiskLevel())) {
            initialStatus = TransactionStatus.FLAGGED;
        }

        Transaction transaction = Transaction.builder()
                .fromAccount(fromAccount)
                .toAccount(toAccount)
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .type(TransactionType.TRANSFER)
                .status(initialStatus)
                .riskLevel(request.getRiskLevel())
                .description(request.getDescription())
                .build();

        Transaction saved = transactionRepository.save(transaction);

        // If not flagged, execute immediately
        if (initialStatus == TransactionStatus.PENDING) {
            return executeTransfer(saved, userId, request.getAgentReasoning());
        }

        // Log the flagged transaction
        auditService.logAction(userId, "TRANSFER_FLAGGED",
                request.getAgentReasoning(),
                String.format("Transfer of %s %s flagged as %s risk",
                        request.getAmount(), request.getCurrency(), request.getRiskLevel()));

        log.info("Transaction {} flagged for review (risk: {})", saved.getId(), request.getRiskLevel());
        return toResponse(saved);
    }

    @Transactional
    public TransactionResponse confirmTransfer(Long transactionId, Long userId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        if (transaction.getStatus() != TransactionStatus.FLAGGED) {
            throw new IllegalStateException("Transaction is not in FLAGGED status");
        }

        // Verify the user owns the source account
        if (!transaction.getFromAccount().getUser().getId().equals(userId)) {
            throw new SecurityException("You do not own this transaction");
        }

        return executeTransfer(transaction, userId, "User confirmed flagged transaction");
    }

    private TransactionResponse executeTransfer(Transaction transaction, Long userId, String reasoning) {
        Account from = transaction.getFromAccount();
        Account to = transaction.getToAccount();

        // Double-check balance
        if (from.getBalance().compareTo(transaction.getAmount()) < 0) {
            transaction.setStatus(TransactionStatus.FAILED);
            transactionRepository.save(transaction);
            throw new IllegalArgumentException("Insufficient balance at execution time");
        }

        // Move money
        from.setBalance(from.getBalance().subtract(transaction.getAmount()));
        to.setBalance(to.getBalance().add(transaction.getAmount()));
        accountRepository.save(from);
        accountRepository.save(to);

        transaction.setStatus(TransactionStatus.COMPLETED);
        Transaction saved = transactionRepository.save(transaction);

        auditService.logAction(userId, "TRANSFER_COMPLETED", reasoning,
                String.format("Transferred %s %s from %s to %s",
                        transaction.getAmount(), transaction.getCurrency(),
                        from.getAccountNumber(), to.getAccountNumber()));

        log.info("Transaction {} completed successfully", saved.getId());
        return toResponse(saved);
    }

    public List<TransactionResponse> getTransactionHistory(Long userId) {
        return transactionRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private TransactionResponse toResponse(Transaction t) {
        return TransactionResponse.builder()
                .id(t.getId())
                .fromAccountId(t.getFromAccount() != null ? t.getFromAccount().getId() : null)
                .fromAccountNumber(t.getFromAccount() != null ? t.getFromAccount().getAccountNumber() : null)
                .toAccountId(t.getToAccount() != null ? t.getToAccount().getId() : null)
                .toAccountNumber(t.getToAccount() != null ? t.getToAccount().getAccountNumber() : null)
                .amount(t.getAmount())
                .currency(t.getCurrency())
                .type(t.getType().name())
                .status(t.getStatus().name())
                .riskLevel(t.getRiskLevel())
                .description(t.getDescription())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
