package com.codeevo.project.util;

import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;
import org.springframework.stereotype.Component;

@Component
public class SanitizerUtil {

    private final PolicyFactory policy = new HtmlPolicyBuilder().toFactory();

    public String sanitize(String input) {
        if (input == null) {
            return null;
        }
        return policy.sanitize(input);
    }
}
