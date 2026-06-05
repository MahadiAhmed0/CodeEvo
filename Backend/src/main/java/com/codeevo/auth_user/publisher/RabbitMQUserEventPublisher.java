package com.codeevo.auth_user.publisher;

import com.codeevo.auth_user.event.UserRegisteredEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

@Component
@RequiredArgsConstructor
public class RabbitMQUserEventPublisher implements UserEventPublisher{
    private final RabbitTemplate rabbitTemplate;
    @Override
    public void publishUserRegisteredEvent(String userId, String email, String firstName, String lastName) {
        UserRegisteredEvent event = new UserRegisteredEvent(userId, email, firstName, lastName);
        rabbitTemplate.convertAndSend("auth.exchange", "user.registered", event);
    }
}
