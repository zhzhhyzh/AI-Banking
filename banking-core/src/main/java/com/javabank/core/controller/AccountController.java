package com.javabank.core.controller;

import com.javabank.core.dto.AccountResponse;
import com.javabank.core.dto.CreateAccountRequest;
import com.javabank.core.security.JwtUserPrincipal;
import com.javabank.core.service.AccountService;
import com.javabank.core.service.AuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final AuditService auditService;

    @PostMapping
    public ResponseEntity<AccountResponse> createAccount(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @Valid @RequestBody CreateAccountRequest request) {

        AccountResponse account = accountService.createAccount(principal.getUserId(), request);

        auditService.logAction(principal.getUserId(), "ACCOUNT_CREATED",
                "AI agent requested account creation",
                String.format("Created %s account %s", request.getAccountType(), account.getAccountNumber()));

        return ResponseEntity.ok(account);
    }

    @GetMapping
    public ResponseEntity<List<AccountResponse>> getAccounts(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(accountService.getAccountsByUser(principal.getUserId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> getAccount(@PathVariable Long id) {
        return ResponseEntity.ok(accountService.getAccountById(id));
    }
}
