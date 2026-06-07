import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserDto {
  id: string
  firstName: string
  lastName: string
  email: string
  avatar?: string | null
  createdAt?: string
  lastLoginAt?: string
}

export interface AuthResponse {
  accessToken: string
  expiresIn: number   // seconds until expiry returned by backend
  user: UserDto
}

interface AuthState {
  accessToken: string | null
  expiresAt: number | null       // epoch ms when the token expires
  user: UserDto | null

  setAuth: (response: AuthResponse) => void
  clearAuth: () => void
  updateUser: (user: UserDto) => void
  isAuthenticated: () => boolean
}

/** Set/clear the lightweight cookie used by the edge middleware */
function setAuthedCookie(value: boolean) {
  if (typeof document === 'undefined') return
  if (value) {
    // Session cookie — cleared when the browser closes, matching typical auth UX
    document.cookie = 'codeevo_authed=1; path=/; SameSite=Lax'
  } else {
    document.cookie = 'codeevo_authed=; path=/; max-age=0; SameSite=Lax'
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      expiresAt: null,
      user: null,

      setAuth: (response: AuthResponse) => {
        const expiresAt = Date.now() + response.expiresIn * 1000
        set({
          accessToken: response.accessToken,
          expiresAt,
          user: response.user,
        })
        setAuthedCookie(true)
      },

      clearAuth: () => {
        set({ accessToken: null, expiresAt: null, user: null })
        setAuthedCookie(false)
      },

      updateUser: (user: UserDto) => {
        set({ user })
      },

      isAuthenticated: () => {
        const { accessToken, expiresAt } = get()
        if (!accessToken || !expiresAt) return false
        // Consider expired if less than 10 seconds remain
        return expiresAt > Date.now() + 10_000
      },
    }),
    {
      name: 'codeevo-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        expiresAt: state.expiresAt,
        user: state.user,
      }),
      // Re-hydrate the cookie whenever the store is reloaded from localStorage
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken && state.expiresAt && state.expiresAt > Date.now() + 10_000) {
          setAuthedCookie(true)
        } else {
          setAuthedCookie(false)
        }
      },
    }
  )
)
