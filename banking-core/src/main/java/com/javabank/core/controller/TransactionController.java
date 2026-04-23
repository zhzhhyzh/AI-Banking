package com.javabank.core.controller;

import com.javabank.core.dto.TransactionResponse;
import com.javabank.core.dto.TransferRequest;
import com.javabank.core.security.JwtUserPrincipal;
import com.javabank.core.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping("/transfer")
    public ResponseEntity<TransactionResponse> transfer(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @Valid @RequestBody TransferRequest request) {
        return ResponseEntity.ok(transactionService.initiateTransfer(principal.getUserId(), request));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<TransactionResponse> confirmTransfer(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(transactionService.confirmTransfer(id, principal.getUserId()));
    }

    @GetMapping
    public ResponseEntity<List<TransactionResponse>> getTransactions(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(transactionService.getTransactionHistory(principal.getUserId()));
    }
}
