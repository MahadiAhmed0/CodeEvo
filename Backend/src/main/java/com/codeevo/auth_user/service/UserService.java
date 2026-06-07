package com.codeevo.auth_user.service;


import com.codeevo.auth_user.domain.User;
import com.codeevo.auth_user.dto.UpdateEmailRequest;
import com.codeevo.auth_user.dto.UpdateNameRequest;
import com.codeevo.auth_user.dto.UpdatePasswordRequest;
import com.codeevo.auth_user.dto.UserDto;
import com.codeevo.auth_user.exception.UserAlreadyExistsException;
import com.codeevo.auth_user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserDto updateName(String userId, UpdateNameRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user = userRepository.save(user);
        return mapToDto(user);
    }

    public UserDto updateEmail(String userId, UpdateEmailRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getEmail().equals(request.getEmail()) && userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new UserAlreadyExistsException("Email already exists");
        }

        user.setEmail(request.getEmail());
        user = userRepository.save(user);
        return mapToDto(user);
    }

    public void updatePassword(String userId, UpdatePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid old password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public UserDto uploadAvatar(String userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        try {
            String uploadDir = "uploads/avatars";
            Path uploadPath = Paths.get(uploadDir);

            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            String newFilename = userId + "_" + UUID.randomUUID().toString() + extension;
            Path filePath = uploadPath.resolve(newFilename);

            Files.copy(file.getInputStream(), filePath);

            // Set the avatar to just the filename so the frontend can build the URL properly
            user.setAvatar(newFilename);
            user = userRepository.save(user);

            return mapToDto(user);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store avatar file", e);
        }
    }

    public UserDto removeAvatar(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setAvatar(null);
        user = userRepository.save(user);
        return mapToDto(user);
    }

    private UserDto mapToDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .avatar(user.getAvatar())
                .build();
    }
}
