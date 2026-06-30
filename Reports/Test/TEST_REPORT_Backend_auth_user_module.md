# Test Report — auth_user module

Generated: 2026-06-29

## Summary

All 16 unit tests pass. Integration tests require Docker (Testcontainers) and are written but were not executed in this environment.

## Unit Tests (pass without Docker)

| Test class | Tests | Result |
|---|---|---|
| `JwtAuthenticationFilterTest` | 6 | ✅ Pass |
| `AuthServiceTest` | 10 | ✅ Pass |
| **Total** | **16** | **✅ Pass** |

## Integration Tests (need `docker compose up -d`)

| Test class | Tests | Prerequisite |
|---|---|---|
| `SecurityConfigTest` | 22 | MongoDB, Redis, RabbitMQ via Testcontainers |
| `AuthControllerIntegrationTest` | 12 | MongoDB, Redis, RabbitMQ via Testcontainers |

## Coverage (auth_user module)

### Instruction coverage by class

| Class | Coverage |
|---|---|
| `JwtAuthenticationFilter` | 100.0% |
| `AuthService` | 96.5% |
| `InvalidTokenException` | 100.0% |
| `UserAlreadyExistsException` | 100.0% |
| `RefreshToken` | 100.0% |
| **Overall module** | **29.0%** |

The remaining classes (`SecurityConfig`, `JwtTokenProvider`, `AuthController`, `UserController`, `UserService`, etc.) are exercised only by integration tests.

## Test details

### JwtAuthenticationFilterTest (6 tests)

| Test | What it verifies |
|---|---|
| `validToken_shouldSetAuthentication` | Valid JWT sets `SecurityContext` with userId |
| `expiredToken_shouldNotSetAuthentication` | Expired token rejected, context stays null |
| `malformedToken_shouldNotSetAuthentication` | Garbage token rejected silently |
| `missingToken_shouldNotSetAuthentication` | No `Authorization` header → no filter interaction |
| `emptyBearerToken_shouldNotSetAuthentication` | `Bearer ` with no actual token → no token provider call |
| `tokenProviderThrowsException_shouldNotSetAuthentication` | `validateToken` exception caught, chain continues |

### AuthServiceTest (10 tests)

| Test | What it verifies |
|---|---|
| `registerLocalUser_shouldEncodePasswordWithArgon2` | Password is Argon2-hashed, not plaintext |
| `registerLocalUser_duplicateEmail_shouldThrow` | Duplicate email → `UserAlreadyExistsException` |
| `loginLocalUser_correctPassword_shouldSucceed` | Correct password → access token returned |
| `loginLocalUser_wrongPassword_shouldThrow` | Wrong password → `BadCredentialsException` |
| `loginLocalUser_nonexistentEmail_shouldThrow` | Unknown email → `BadCredentialsException` |
| `refreshToken_validToken_shouldRotate` | Valid refresh token → rotated, new tokens returned |
| `refreshToken_expiredToken_shouldThrow` | Expired token → removed + `InvalidTokenException` |
| `refreshToken_invalidToken_shouldThrow` | Unknown token hash → `InvalidTokenException` |
| `logout_shouldRemoveToken` | Known token → `removeRefreshToken` called |
| `logout_unknownToken_shouldDoNothing` | Unknown token → no removal attempted |

### SecurityConfigTest (22 tests, integration)

- 11 public route tests: `/api/auth/**`, `/api/github/auth/login`, `/api/github/auth/callback`, `/oauth2/**`, `/error`, `GET /api/users/avatar/**`, swagger
- 11 protected route tests: `/api/projects`, `/api/users/*`, `/api/github/auth/status`, `/api/github/repos`, `/api/rag/**`, arbitrary unlisted endpoint

### AuthControllerIntegrationTest (12 tests, integration)

| Test | What it verifies |
|---|---|
| `register_shouldCreateUserAndReturnTokens` | Full register flow, Argon2 hash verified in DB |
| `register_duplicateEmail_shouldReturn409` | Duplicate email rejected |
| `login_correctPassword_shouldReturnTokens` | Login returns access token + HttpOnly cookie |
| `login_wrongPassword_shouldReturn401` | Wrong password → 401 |
| `refreshToken_shouldRotateAndReturnNewTokens` | Cookie-based refresh rotates token |
| `refreshToken_expiredToken_shouldReturn401` | Expired refresh token rejected |
| `reusedRefreshToken_afterRotation_shouldReturn401` | Reusing a rotated token fails |
| `refreshToken_missingCookie_shouldReturn400` | No cookie → 400 |
| `logout_shouldRemoveRefreshToken` | Logout clears cookie + invalidates token |
| `websocketJwt_shouldValidateViaQueryParam` | Generated token is valid for WS handshake |
| `websocketJwt_malformedToken_shouldBeInvalid` | `validateToken` returns false for garbage |
| `websocketJwt_expiredToken_shouldBeInvalid` | Token expiry checked |
| `register_invalidPassword_shouldReturn400` | Weak password → 400 validation error |

## Setup

**Test profile:** `application-test.properties` with fake API keys (no real credentials).
**Container management:** Testcontainers via `AbstractIntegrationTest` base class — MongoDB (official), Redis (generic), RabbitMQ (dedicated container).
**Port wiring:** `@DynamicPropertySource` overrides `spring.data.mongodb.uri`, `spring.data.redis.host:port`, `spring.rabbitmq.host:port` at test time.
**Coverage:** JaCoCo 0.8.12, report at `target/site/jacoco/index.html` after `mvn verify`.

## Files created

```
src/test/resources/application-test.properties
src/test/java/com/codeevo/AbstractIntegrationTest.java
src/test/java/com/codeevo/auth_user/security/JwtAuthenticationFilterTest.java
src/test/java/com/codeevo/auth_user/config/SecurityConfigTest.java
src/test/java/com/codeevo/auth_user/service/AuthServiceTest.java
src/test/java/com/codeevo/auth_user/controller/AuthControllerIntegrationTest.java
```
