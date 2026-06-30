# Frontend Test Report — CodeEvo `lib/` Layer

**Date:** 2026-06-29  
**Toolchain:** Vitest 4.1.9, jsdom, @testing-library/jest-dom  
**Run command:** `npm test` (also: `npm run test:watch`)  
**Typecheck:** `npx tsc --noEmit` — clean

---

## Results

| Status | Test Files | Tests |
|--------|-----------|-------|
| ✅ Passed | 7 of 7 | 88 of 88 |
| ❌ Failed | 0 | 0 |

---

## Test Suites

### 1. `api.test.ts` — 17 tests

Tests `fetchWithAuth`, `extractErrorMessage`, `authApi`, and `userApi`.

- **Token attachment:** Bearer header injected when `accessToken` is set in auth store
- **Same-origin paths:** All requests go through `/api/...` (refresh cookie stays attached)
- **401 refresh flow:** On 401, calls `/api/auth/refresh`, stores new token, retries original request exactly once
- **Refresh failure:** Calls `clearAuth()` and redirects to `/auth` when refresh also returns 401
- **Error extraction:** Handles JSON `message`/`error`/`detail`, Spring validation `errors[0].defaultMessage`, and plain text fallback
- **Custom headers:** Merged with Bearer token without collision
- **Auth API:** `login`, `register`, `logout` all hit correct endpoints with `credentials: 'include'`
- **User API:** `updateName` routes through `fetchWithAuth`

### 2. `auth-store.test.ts` — 11 tests

Tests the zustand auth store with `persist` middleware.

- **Initial state:** `accessToken`, `expiresAt`, `user` all null
- **`setAuth`:** Computes `expiresAt` from `expiresIn`, stores user, sets `codeevo_authed=1` cookie
- **`clearAuth`:** Resets state, removes cookie
- **`updateUser`:** Partial update preserves token
- **`isAuthenticated`:** Valid when token is fresh, false when null or expired
- **LocalStorage:** Persists under `codeevo-auth` key; `partialize` excludes non-serializable methods

### 3. `store.test.ts` — 17 tests

Tests the diagram store (`useDiagramStore`).

- **Node operations:** `addNode`, `removeNode` (cascades to edges), `setNodes` (full replace), `updateNodePosition`
- **Edge operations:** `addEdge`, `removeEdge`, `setEdges`
- **Selection:** `setSelectedNode`
- **Docker:** `setDockerStatus`, `setDockerLogs` (also parses build error/warning patterns into `dockerProblems`)
- **View state:** `setPreviewUrl`, `setAPITesting`/`resetAPITesting`, `setViewMode`, `setIsChatbotExpanded`, `setProjectSettings`

### 4. `agent-store.test.ts` — 17 tests

Tests the agent store — the core bridge between WebSocket events and UI state. Uses `vi.mock` with `vi.hoisted` to stub `@/lib/websocket`.

- **Connection lifecycle:** `connect` calls `stompClient.connect(token)`, subscribes to three session topics (`/topic/session/{id}/events`, `/diffs`, `/graph`)
- **Disconnect:** Calls `stompClient.disconnect()`, resets `isConnected`
- **Message sending:** `sendMessage` publishes to `/app/user-input`, sets `isAgentRunning`, tracks `lastUserQuery`
- **Event processing:** Deduplicates by `eventId`; `TASK_COMPLETE`/`FATAL_ERROR` stop agent; `DIFF_READY`/`PERMISSION_REQ` enqueue approvals; `GRAPH_UPDATE` stores latest payload
- **Feedback:** `sendFeedback` removes matching approval, publishes to `/app/agent-feedback`
- **Utility:** `clearEvents`, `dismissApproval`, `stopAgent`

### 5. `github-store.test.ts` — 5 tests

Tests the zustand GitHub store with `persist` middleware.

- **Initial state:** Disconnected, null user/token
- **`setConnected`:** Stores connection flag, user, and token
- **`disconnect`:** Clears everything
- **LocalStorage:** Persists under `codeevo-github` key

### 6. `websocket.test.ts` — 10 tests

Tests `StompClientWrapper` — the STOMP/SockJS singleton. Mocks `@stomp/stompjs` `Client` constructor and `sockjs-client` default export.

- **Connect:** Creates `Client`, calls `activate()`, resolves promise on `onConnect`; deduplicates concurrent connect calls
- **Disconnect:** Calls `deactivate()`, clears `isConnected`
- **Subscribe:** Calls `client.subscribe(destination, handler)`, returns string `subId`; parses JSON body into `AgentEvent` before calling callback
- **Unsubscribe:** Calls `sub.unsubscribe()` and removes from internal map
- **Send:** Calls `client.publish({ destination, body: JSON.stringify(...) })`
- **subscribeRaw:** Passes raw `IMessage` without JSON parsing

### 7. `middleware.test.ts` — 11 tests

Tests the Next.js edge middleware — authentication gating using the `codeevo_authed` cookie. Mocks `next/server` `NextResponse`.

- **Protected routes:** `/dashboard`, `/settings`, `/projects`, `/git`, `/notifications` all redirect to `/auth` when unauthenticated
- **Authenticated access:** Same routes pass through when `codeevo_authed=1` cookie is present
- **Auth route redirect:** Authenticated users on `/auth` are redirected to `/dashboard`
- **Callback exception:** `/auth/github/callback` is allowed when authenticated
- **Public routes:** `/` always passes through
- **Redirect parameter:** Preserves original pathname as `?redirect=` query param

---

## Files Added

| File | Purpose |
|------|---------|
| `Frontend/vitest.config.ts` | Vitest configuration: jsdom env, `@/*` alias, setup file |
| `Frontend/lib/__tests__/setup.ts` | Global test setup (`@testing-library/jest-dom/vitest`) |
| `Frontend/lib/__tests__/api.test.ts` | 17 tests for API client |
| `Frontend/lib/__tests__/auth-store.test.ts` | 11 tests for auth store |
| `Frontend/lib/__tests__/store.test.ts` | 17 tests for diagram store |
| `Frontend/lib/__tests__/agent-store.test.ts` | 17 tests for agent store |
| `Frontend/lib/__tests__/github-store.test.ts` | 5 tests for GitHub store |
| `Frontend/lib/__tests__/websocket.test.ts` | 10 tests for STOMP client |
| `Frontend/lib/__tests__/middleware.test.ts` | 11 tests for edge middleware |

## Files Modified

| File | Change |
|------|--------|
| `Frontend/package.json` | Added `test` and `test:watch` scripts |

## Dependencies Added

```
vitest, @testing-library/react, @testing-library/jest-dom,
@testing-library/user-event, jsdom, msw
```
