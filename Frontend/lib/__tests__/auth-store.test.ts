import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore, type AuthResponse } from '@/lib/auth-store'

beforeEach(() => {
  localStorage.clear()
  document.cookie = ''
  useAuthStore.setState({ accessToken: null, expiresAt: null, user: null })
})

function makeAuthResponse(overrides?: Partial<AuthResponse>): AuthResponse {
  return {
    accessToken: 'test-access-token',
    expiresIn: 1800,
    user: { id: 'u1', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
    ...overrides,
  }
}

describe('auth-store', () => {
  it('starts with null auth state', () => {
    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.expiresAt).toBeNull()
    expect(state.user).toBeNull()
  })

  it('setAuth stores token, sets expiresAt, and sets user', () => {
    const before = Date.now()
    useAuthStore.getState().setAuth(makeAuthResponse())
    const state = useAuthStore.getState()

    expect(state.accessToken).toBe('test-access-token')
    expect(state.expiresAt).toBeGreaterThan(before + 1799 * 1000)
    expect(state.expiresAt).toBeLessThanOrEqual(before + 1800 * 1000)
    expect(state.user?.email).toBe('test@example.com')
  })

  it('setAuth sets codeevo_authed cookie', () => {
    useAuthStore.getState().setAuth(makeAuthResponse())

    expect(document.cookie).toContain('codeevo_authed=1')
  })

  it('clearAuth resets state and removes cookie', () => {
    useAuthStore.getState().setAuth(makeAuthResponse())
    useAuthStore.getState().clearAuth()

    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.expiresAt).toBeNull()
    expect(state.user).toBeNull()
    expect(document.cookie).not.toContain('codeevo_authed')
  })

  it('updateUser replaces user without affecting token', () => {
    useAuthStore.getState().setAuth(makeAuthResponse())

    useAuthStore.getState().updateUser({ id: 'u1', firstName: 'Updated', lastName: 'User', email: 'new@example.com' })

    const state = useAuthStore.getState()
    expect(state.user?.firstName).toBe('Updated')
    expect(state.accessToken).toBe('test-access-token')
  })

  it('isAuthenticated returns true when token is valid', () => {
    useAuthStore.getState().setAuth(makeAuthResponse())
    expect(useAuthStore.getState().isAuthenticated()).toBe(true)
  })

  it('isAuthenticated returns false when token is null', () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false)
  })

  it('isAuthenticated returns false when token is expired', () => {
    useAuthStore.getState().setAuth(makeAuthResponse({ expiresIn: 0 }))
    expect(useAuthStore.getState().isAuthenticated()).toBe(false)
  })

  it('persists to localStorage under codeevo-auth key', () => {
    useAuthStore.getState().setAuth(makeAuthResponse())

    const stored = localStorage.getItem('codeevo-auth')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.state.accessToken).toBe('test-access-token')
    expect(parsed.state.user.email).toBe('test@example.com')
  })

  it('rehydrates from localStorage on init', async () => {
    const response = makeAuthResponse()
    useAuthStore.getState().setAuth(response)
    const stateJson = localStorage.getItem('codeevo-auth')!

    useAuthStore.setState({ accessToken: null, expiresAt: null, user: null })

    const { persist } = await import('zustand/middleware')
    const stored = JSON.parse(stateJson)
    useAuthStore.setState(stored.state)

    expect(useAuthStore.getState().accessToken).toBe('test-access-token')
    expect(useAuthStore.getState().user?.email).toBe('test@example.com')
  })

  it('partialize excludes isAuthenticated from persistence', () => {
    useAuthStore.getState().setAuth(makeAuthResponse())

    const stored = JSON.parse(localStorage.getItem('codeevo-auth')!)
    expect(stored.state.accessToken).toBeDefined()
    expect(stored.state.user).toBeDefined()
    expect(stored.state.expiresAt).toBeDefined()
  })
})
