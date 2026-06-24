package com.codeevo;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.EnableAsync;

import com.codeevo.agent.config.AgentModelProperties;

/**
 * ██████╗ ██████╗ ██████╗ ███████╗███████╗██╗   ██╗ ██████╗
 * ██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝██║   ██║██╔═══██╗
 * ██║     ██║   ██║██║  ██║█████╗  ███████╗██║   ██║██║   ██║
 * ██║     ██║   ██║██║  ██║██╔══╝  ╚════██║╚██╗ ██╔╝██║   ██║
 * ╚██████╗╚██████╔╝██████╔╝███████╗███████║ ╚████╔╝ ╚██████╔╝
 *  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚══════╝  ╚═══╝   ╚═════╝
 *
 * Single entry point for the entire CodeEvo platform.
 *
 * Modules started by this application:
 *   ├── com.codeevo.auth_user   → JWT auth, OAuth2, user management
 *   ├── com.codeevo.project     → Project CRUD, diagram, code, history
 *   └── com.codeevo.agent       → Quad-Agent AI system
 *                                  ├── Supervisor (deterministic orchestrator)
 *                                  ├── Chat AI        (Groq llama3-70b-8192)
 *                                  ├── Visual Architect (Groq llama3-70b-8192)
 *                                  └── Coding Agent  (Groq llama-3.1-70b-versatile)
 *
 * Infrastructure required:
 *   • MongoDB  → mongodb://localhost:27017/auth_db
 *   • Redis    → localhost:6379
 *   • RabbitMQ → localhost:5672  (legacy event bus, auth module)
 *
 * WebSocket endpoint: ws://localhost:8080/ws  (STOMP over SockJS)
 */
@Slf4j
@EnableAsync
@SpringBootApplication(scanBasePackages = "com.codeevo")
@EnableConfigurationProperties(AgentModelProperties.class)
public class CodeEvoApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(CodeEvoApplication.class);
        app.run(args);
    }

    /**
     * Increase Tomcat's max HTTP header size to handle large JWT tokens
     * and base64-encoded diagram payloads.
     */
    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatCustomizer() {
        return factory -> factory.addConnectorCustomizers(connector ->
                connector.setProperty("maxHttpHeaderSize", "65536"));
    }

    /**
     * Logs a startup banner with all agent model names read from application.properties,
     * so you can visually confirm which LLM each agent is using at boot time.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onReady(ApplicationReadyEvent event) {
        AgentModelProperties props = event.getApplicationContext()
                .getBean(AgentModelProperties.class);

        log.info("""
                
                ╔══════════════════════════════════════════════════════════════╗
                ║           CodeEvo — Server Started Successfully              ║
                ╠══════════════════════════════════════════════════════════════╣
                ║  REST API    →  http://localhost:8080/api                    ║
                ║  Swagger UI  →  http://localhost:8080/swagger-ui.html        ║
                ║  WebSocket   →  ws://localhost:8080/ws  (STOMP/SockJS)       ║
                ╠══════════════════════════════════════════════════════════════╣
                ║  AGENT CONFIGURATION                                         ║
                ║  ┌─────────────────────────────────────────────────────┐     ║
                ║  │ Supervisor  : {}
                ║  │ Chat AI     : {} ({} @ {})
                ║  │ Architect   : {} ({} @ {})
                ║  │ Coding      : {} ({} @ {})
                ║  │ Summarizer  : {} ({})
                ║  └─────────────────────────────────────────────────────┘     ║
                ║  To change models, edit application.properties and restart.  ║
                ╚══════════════════════════════════════════════════════════════╝
                """,
                props.getSupervisor().getName(),
                props.getChat().getName(), props.getChat().getModel(), props.getChat().getProvider(),
                props.getArchitect().getName(), props.getArchitect().getModel(), props.getArchitect().getProvider(),
                props.getCoding().getName(), props.getCoding().getModel(), props.getCoding().getProvider(),
                props.getSummarizer().getName(), props.getSummarizer().getModel()
        );
    }
}
