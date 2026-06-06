/**
 * Central API client for the CodeEvo Auth & User Gateway.
 *
 * All requests go through /api/** which Next.js rewrites to
 * http://localhost:8080/api/** (see next.config.mjs).
 * This keeps the refresh_token HttpOnly cookie on the same origin.
 */

import { useAuthStore } from './auth-store'
import type { AuthResponse, UserDto } from './auth-store'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  password: string
}

export interface UpdateNameRequest {
  firstName: string
  lastName: string
}

export interface UpdateEmailRequest {
  email: string
}

export interface UpdatePasswordRequest {
  oldPassword: string
  newPassword: string
}

// ─── Error helpers ────────────────────────────────────────────────────────────

/**
 * Try to extract a human-readable message from a non-2xx response.
 * Spring Boot typically returns { message: string } or { error: string }.
 */
export async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const ct = res.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) {
      const body = await res.json()
      return (
        body?.message ||
        body?.error ||
        body?.detail ||
        // Spring validation errors return { errors: [{ defaultMessage }] }
        body?.errors?.[0]?.defaultMessage ||
        `Request failed (${res.status})`
      )
    }
    const text = await res.text()
    return text || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

/**
 * Perform a refresh-token round-trip.
 * Returns true if a new access token was stored, false otherwise.
 */
async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // sends the HttpOnly refresh_token cookie
    })
    if (!res.ok) return false
    const data: AuthResponse = await res.json()
    useAuthStore.getState().setAuth(data)
    return true
  } catch {
    return false
  }
}

/**
 * Fetch with automatic Bearer token attachment.
 * On 401, attempts a silent token refresh once and retries the original request.
 * On refresh failure, clears auth state (user will be redirected by middleware).
 */
export async function fetchWithAuth(
  input: string,
  init: RequestInit = {},
  retry = true
): Promise<Response> {
  const { accessToken } = useAuthStore.getState()

  const headers = new Headers(init.headers ?? {})
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (res.status === 401 && retry) {
    // Deduplicate parallel refresh calls
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = doRefresh().finally(() => {
        isRefreshing = false
        refreshPromise = null
      })
    }
    const refreshed = await refreshPromise!
    if (!refreshed) {
      useAuthStore.getState().clearAuth()
      // Redirect client-side; middleware handles the server-side case
      if (typeof window !== 'undefined') {
        window.location.href = '/auth'
      }
      return res
    }
    // Retry with the new token (retry=false to prevent infinite loops)
    return fetchWithAuth(input, init, false)
  }

  return res
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  logout: async (): Promise<void> => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  },

  refresh: async (): Promise<AuthResponse | null> => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  },
}

// ─── User API ─────────────────────────────────────────────────────────────────

export const userApi = {
  updateName: async (data: UpdateNameRequest): Promise<UserDto> => {
    const res = await fetchWithAuth('/api/users/name', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  updateEmail: async (data: UpdateEmailRequest): Promise<UserDto> => {
    const res = await fetchWithAuth('/api/users/email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  updatePassword: async (data: UpdatePasswordRequest): Promise<void> => {
    const res = await fetchWithAuth('/api/users/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res))
  },

  uploadAvatar: async (file: File): Promise<UserDto> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetchWithAuth('/api/users/avatar', {
      method: 'POST',
      body: form,
      // Do NOT set Content-Type — browser sets multipart boundary automatically
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  /** Returns the full URL for a stored avatar filename */
  avatarUrl: (filename: string): string =>
    `/api/users/avatar/${encodeURIComponent(filename)}`,
}
