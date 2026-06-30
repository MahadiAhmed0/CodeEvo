package com.codeevo.auth_user.config;

import com.codeevo.AbstractIntegrationTest;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Tag("requires-docker")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SecurityConfigTest extends AbstractIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    @Test
    void apiAuthRegister_shouldBePublic() {
        ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/auth/register"), null, String.class);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
    }

    @Test
    void apiAuthLogin_shouldBePublic() {
        ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/auth/login"), null, String.class);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
    }

    @Test
    void apiAuthRefresh_shouldBePublic() {
        ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/auth/refresh"), null, String.class);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
    }

    @Test
    void apiGithubAuthLogin_shouldBePublic() {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/github/auth/login"), String.class);
        assertEquals(HttpStatus.FOUND, resp.getStatusCode());
    }

    @Test
    void apiGithubAuthCallback_shouldBePublic() {
        ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/github/auth/callback"), null, String.class);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
    }

    @Test
    void oauth2Endpoints_shouldBePublic() {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/oauth2/authorization/google"), String.class);
        assertEquals(HttpStatus.FOUND, resp.getStatusCode());
    }

    @Test
    void errorEndpoint_shouldBePublic() {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/error"), String.class);
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, resp.getStatusCode());
    }

    @Test
    void avatarGet_shouldBePublic() {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/users/avatar/test.jpg"), String.class);
        assertEquals(HttpStatus.NOT_FOUND, resp.getStatusCode());
    }

    @Test
    void swaggerUi_shouldBePublic() {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/swagger-ui.html"), String.class);
        assertEquals(HttpStatus.FOUND, resp.getStatusCode());
    }

    @Test
    void swaggerUiPath_shouldBePublic() {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/swagger-ui/index.html"), String.class);
        assertEquals(HttpStatus.FOUND, resp.getStatusCode());
    }

    @Test
    void apiDocs_shouldBePublic() {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/v3/api-docs"), String.class);
        assertEquals(HttpStatus.FOUND, resp.getStatusCode());
    }

    @Test
    void apiProjects_shouldRequireAuth() {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/projects"), String.class);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }

    @Test
    void apiUsersName_shouldRequireAuth() {
        RequestEntity<Void> req = RequestEntity.put(URI.create(url("/api/users/name"))).build();
        ResponseEntity<String> resp = restTemplate.exchange(req, String.class);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }

    @Test
    void apiUsersEmail_shouldRequireAuth() {
        RequestEntity<Void> req = RequestEntity.put(URI.create(url("/api/users/email"))).build();
        ResponseEntity<String> resp = restTemplate.exchange(req, String.class);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }

    @Test
    void apiUsersPassword_shouldRequireAuth() {
        RequestEntity<Void> req = RequestEntity.put(URI.create(url("/api/users/password"))).build();
        ResponseEntity<String> resp = restTemplate.exchange(req, String.class);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }

    @Test
    void apiUsersAvatarPost_shouldRequireAuth() {
        ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/users/avatar"), null, String.class);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }

    @Test
    void apiUsersAvatarDelete_shouldRequireAuth() {
        RequestEntity<Void> req = RequestEntity.delete(URI.create(url("/api/users/avatar"))).build();
        ResponseEntity<String> resp = restTemplate.exchange(req, String.class);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }

    @Test
    void apiGithubAuthStatus_shouldRequireAuth() {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/github/auth/status"), String.class);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }

    @Test
    void apiGithubRepos_shouldRequireAuth() {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/github/repos"), String.class);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }

    @Test
    void apiRag_shouldRequireAuth() {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/rag/project-123/status"), String.class);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }

    @Test
    void anyOtherEndpoint_shouldRequireAuth() {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/some/random/endpoint"), String.class);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
    }
}
