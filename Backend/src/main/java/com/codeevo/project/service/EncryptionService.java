package com.codeevo.project.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

@Slf4j
@Service
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128; // in bits

    private final byte[] key;
    private final SecureRandom secureRandom;

    public EncryptionService(@Value("${codeevo.project.encryption-key}") String encryptionKeyBase64) {
        byte[] decodedKey = null;
        try {
            decodedKey = Base64.getDecoder().decode(encryptionKeyBase64);
        } catch (IllegalArgumentException e) {
            // Fallback for local dev if not base64
            decodedKey = encryptionKeyBase64.getBytes();
        }
        
        if (decodedKey.length != 32 && decodedKey.length != 16 && decodedKey.length != 24) {
            log.warn("Encryption key length is not standard (16/24/32). Pad or truncate for local dev fallback.");
            byte[] padded = new byte[32];
            System.arraycopy(decodedKey, 0, padded, 0, Math.min(decodedKey.length, 32));
            decodedKey = padded;
        }
        this.key = decodedKey;
        this.secureRandom = new SecureRandom();
    }

    public EncryptedData encrypt(String plainText) {
        if (plainText == null) return null;
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            SecretKeySpec secretKeySpec = new SecretKeySpec(key, "AES");
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, parameterSpec);

            byte[] cipherText = cipher.doFinal(plainText.getBytes());

            return new EncryptedData(
                    Base64.getEncoder().encodeToString(cipherText),
                    Base64.getEncoder().encodeToString(iv)
            );
        } catch (Exception e) {
            log.error("Encryption failed", e);
            throw new RuntimeException("Encryption failed");
        }
    }

    public String decrypt(String cipherTextBase64, String ivBase64) {
        if (cipherTextBase64 == null || ivBase64 == null) return null;
        try {
            byte[] cipherText = Base64.getDecoder().decode(cipherTextBase64);
            byte[] iv = Base64.getDecoder().decode(ivBase64);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            SecretKeySpec secretKeySpec = new SecretKeySpec(key, "AES");
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, parameterSpec);

            byte[] plainText = cipher.doFinal(cipherText);
            return new String(plainText);
        } catch (Exception e) {
            log.error("Decryption failed", e);
            throw new RuntimeException("Decryption failed");
        }
    }

    public static class EncryptedData {
        public final String cipherText;
        public final String nonce;

        public EncryptedData(String cipherText, String nonce) {
            this.cipherText = cipherText;
            this.nonce = nonce;
        }
    }
}
