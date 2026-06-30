import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWithAuth, extractErrorMessage, authApi, userApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'

const origLocation = window.location

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ accessToken: null, expiresAt: null, user: null })
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...origLocation, href: '' },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: origLocation,
  })
})

describe('fetchWithAuth', () => {
  it('attaches Bearer token when accessToken is set', async () => {
    useAuthStore.setState({ accessToken: 'test-token' })
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    await fetchWithAuth('/api/projects')

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers.get('Authorization')).toBe('Bearer test-token')
  })

  it('calls same-origin /api/... path', async () => {
    useAuthStore.setState({ accessToken: 'test-token' })
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    await fetchWithAuth('/api/projects')

    expect(mockFetch.mock.calls[0][0]).toBe('/api/projects')
  })

  it('includes credentials: include', async () => {
    useAuthStore.setState({ accessToken: 'test-token' })
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    await fetchWithAuth('/api/projects')

    expect(mockFetch.mock.calls[0][1].credentials).toBe('include')
  })

  it('does not set Authorization when no token', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    await fetchWithAuth('/api/projects')

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers.has('Authorization')).toBe(false)
  })

  it('returns response on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 })))

    const res = await fetchWithAuth('/api/projects')
    expect(res.status).toBe(200)
  })

  it('attempts token refresh on 401 and retries', async () => {
    useAuthStore.setState({ accessToken: 'initial-token', expiresAt: Date.now() + 99999, user: { id: '1', firstName: 'A', lastName: 'B', email: 'a@b.com' } })

    let callCount = 0
    const mockFetch = vi.fn((url: string) => {
      callCount++
      if (url === '/api/auth/refresh') {
        return Promise.resolve(new Response(JSON.stringify({ accessToken: 'new-token', expiresIn: 3600, user: { id: '1', firstName: 'A', lastName: 'B', email: 'a@b.com' } }), { status: 200 }))
      }
      if (callCount === 1) return Promise.resolve(new Response('unauthorized', { status: 401 }))
      return Promise.resolve(new Response('ok', { status: 200 }))
    })

    vi.stubGlobal('fetch', mockFetch)

    const res = await fetchWithAuth('/api/projects')
    expect(res.status).toBe(200)
  })

  it('clears auth and redirects on refresh failure', async () => {
    useAuthStore.setState({ accessToken: 'initial-token', expiresAt: Date.now() + 99999, user: { id: '1', firstName: 'A', lastName: 'B', email: 'a@b.com' } })

    const setAuthSpy = vi.spyOn(useAuthStore.getState(), 'clearAuth')

    let fetchCall = 0
    vi.stubGlobal('fetch', vi.fn(() => {
      fetchCall++
      if (fetchCall === 1) return Promise.resolve(new Response('unauthorized', { status: 401 }))
      return Promise.resolve(new Response('refresh expired', { status: 401 }))
    }))

    await fetchWithAuth('/api/projects')

    expect(setAuthSpy).toHaveBeenCalled()
  })

  it('merges custom headers with auth header', async () => {
    useAuthStore.setState({ accessToken: 'test-token' })
    const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    await fetchWithAuth('/api/projects', {
      headers: { 'Content-Type': 'application/json' },
    })

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers.get('Authorization')).toBe('Bearer test-token')
    expect(headers.get('Content-Type')).toBe('application/json')
  })
})

describe('extractErrorMessage', () => {
  it('extracts message from JSON body', async () => {
    const res = new Response(JSON.stringify({ message: 'Bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
    const msg = await extractErrorMessage(res)
    expect(msg).toBe('Bad request')
  })

  it('falls back to error field', async () => {
    const res = new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
    const msg = await extractErrorMessage(res)
    expect(msg).toBe('Forbidden')
  })

  it('extracts Spring validation errors', async () => {
    const res = new Response(JSON.stringify({ errors: [{ defaultMessage: 'Name is required' }] }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
    const msg = await extractErrorMessage(res)
    expect(msg).toBe('Name is required')
  })

  it('falls back to response text for non-JSON', async () => {
    const res = new Response('Not Found', { status: 404 })
    const msg = await extractErrorMessage(res)
    expect(msg).toBe('Not Found')
  })
})

describe('authApi', () => {
  it('login calls /api/auth/login with credentials', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 't', expiresIn: 3600, user: { id: '1', firstName: 'A', lastName: 'B', email: 'a@b.com' } }), { status: 200 })
    )
    vi.stubGlobal('fetch', mockFetch)

    await authApi.login({ email: 'a@b.com', password: 'secret' })

    expect(mockFetch.mock.calls[0][0]).toBe('/api/auth/login')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    expect(mockFetch.mock.calls[0][1].credentials).toBe('include')
  })

  it('login throws on error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    ))

    await expect(authApi.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow('Invalid credentials')
  })

  it('register calls /api/auth/register', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 't', expiresIn: 3600, user: { id: '1', firstName: 'A', lastName: 'B', email: 'a@b.com' } }), { status: 200 })
    )
    vi.stubGlobal('fetch', mockFetch)

    await authApi.register({ firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'secret' })

    expect(mockFetch.mock.calls[0][0]).toBe('/api/auth/register')
  })

  it('logout calls /api/auth/logout', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', mockFetch)

    await authApi.logout()

    expect(mockFetch.mock.calls[0][0]).toBe('/api/auth/logout')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
  })
})

describe('userApi', () => {
  it('updateName uses fetchWithAuth to /api/users/name', async () => {
    useAuthStore.setState({ accessToken: 't' })
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: '1', firstName: 'New', lastName: 'Name', email: 'a@b.com' }), { status: 200 })
    )
    vi.stubGlobal('fetch', mockFetch)

    await userApi.updateName({ firstName: 'New', lastName: 'Name' })

    expect(mockFetch.mock.calls[0][0]).toBe('/api/users/name')
    expect(mockFetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer t')
  })
})
