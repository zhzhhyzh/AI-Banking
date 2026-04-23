package com.javabank.core.dto;

import com.javabank.core.entity.AccountType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateAccountRequest {
    @NotNull(message = "Account type is required")
    private AccountType accountType;

    private String currency = "USD";
}
