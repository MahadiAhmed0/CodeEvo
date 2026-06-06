package com.codeevo.auth_user.controller;


import com.codeevo.auth_user.dto.UpdateEmailRequest;
import com.codeevo.auth_user.dto.UpdateNameRequest;
import com.codeevo.auth_user.dto.UpdatePasswordRequest;
import com.codeevo.auth_user.dto.UserDto;
import com.codeevo.auth_user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.Files;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PutMapping("/name")
    public ResponseEntity<UserDto> updateName(@Valid @RequestBody UpdateNameRequest request) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        UserDto updatedUser = userService.updateName(userId, request);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/email")
    public ResponseEntity<UserDto> updateEmail(@Valid @RequestBody UpdateEmailRequest request) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        UserDto updatedUser = userService.updateEmail(userId, request);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/password")
    public ResponseEntity<Void> updatePassword(@Valid @RequestBody UpdatePasswordRequest request) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        userService.updatePassword(userId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserDto> uploadAvatar(@RequestParam("file") MultipartFile file) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        UserDto updatedUser = userService.uploadAvatar(userId, file);
        return ResponseEntity.ok(updatedUser);
    }

    @GetMapping("/avatar/{filename}")
    public ResponseEntity<Resource> getAvatar(@PathVariable String filename) {
        try {
            Path file = Paths.get("uploads/avatars").resolve(filename);
            Resource resource = new UrlResource(file.toUri());

            if (resource.exists() || resource.isReadable()) {
                String contentType = Files.probeContentType(file);
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
