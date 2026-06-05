package com.codeevo.auth_user.publisher;

public interface UserEventPublisher {
    void publishUserRegisteredEvent(String userId, String email, String firstName, String lastName);
}
