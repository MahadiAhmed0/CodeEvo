package com.codeevo.auth_user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEmailRequest {
    @NotBlank(message = "Email cannot be empty")
    @Email(message = "Email should be valid")
    private String email;
}
