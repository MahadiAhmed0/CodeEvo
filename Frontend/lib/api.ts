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

  removeAvatar: async (): Promise<UserDto> => {
    const res = await fetchWithAuth('/api/users/avatar', {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  /** Returns the full URL for a stored avatar filename */
  avatarUrl: (filename: string): string => {
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return filename
    }
    return `/api/users/avatar/${encodeURIComponent(filename)}`
  },
}

// ─── Project / Diagram API ────────────────────────────────────────────────────

export interface DiagramData {
  nodes: any[]
  edges: any[]
  timestamp: string
}

export const projectApi = {
  /**
   * Create a new project.
   */
  createProject: async (name: string, description: string): Promise<{ id: string }> => {
    const res = await fetchWithAuth('/api/projects', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({ name, description, status: 'active' })
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  /**
   * Fetch the saved diagram for a project.
   */
  getDiagram: async (projectId: string): Promise<DiagramData | null> => {
    const res = await fetchWithAuth(`/api/projects/${encodeURIComponent(projectId)}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    const projectDetail = await res.json()
    
    if (projectDetail.diagramJson) {
      try {
        return JSON.parse(projectDetail.diagramJson) as DiagramData
      } catch (e) {
        console.error('Failed to parse diagramJson', e)
        return null
      }
    }
    return null
  },

  /**
   * Upsert the diagram for a project.
   */
  saveDiagram: async (projectId: string, diagram: DiagramData): Promise<void> => {
    const payload = {
      diagramJson: JSON.stringify(diagram),
      changeMessage: 'Auto-saved diagram'
    }
    const res = await fetchWithAuth(
      `/api/projects/${encodeURIComponent(projectId)}/diagram`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    if (!res.ok) throw new Error(await extractErrorMessage(res))
  },

  /**
   * List all projects for the current user.
   */
  listProjects: async (): Promise<any> => {
    const res = await fetchWithAuth('/api/projects?size=50')
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  /**
   * Get recent projects.
   */
  getRecentProjects: async (): Promise<any[]> => {
    const res = await fetchWithAuth('/api/projects/recent')
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  /**
   * Get dashboard stats.
   */
  getDashboardStats: async (): Promise<any> => {
    const res = await fetchWithAuth('/api/projects/stats')
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },
  /**
   * Delete a project (soft by default, pass hard=true for permanent).
   */
  deleteProject: async (projectId: string, hard = false): Promise<void> => {
    const res = await fetchWithAuth(
      `/api/projects/${encodeURIComponent(projectId)}?hard=${hard}`,
      { method: 'DELETE' }
    )
    if (!res.ok) throw new Error(await extractErrorMessage(res))
  },
}

// ─── Project History API ──────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string
  message: string
  commitHash: string
  nodeDelta: number
  edgeDelta: number
  createdAt: string
  createdBy: string
  diagramJson?: string
}

export interface HistoryPageResponse {
  content: HistoryEntry[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export const projectHistoryApi = {
  /**
   * Fetch paginated history for a project (newest first).
   */
  getHistory: async (projectId: string, page = 0, size = 50): Promise<HistoryPageResponse> => {
    const res = await fetchWithAuth(
      `/api/projects/${encodeURIComponent(projectId)}/history?page=${page}&size=${size}`
    )
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  /**
   * Get a single history entry including its diagramJson snapshot.
   */
  getHistoryEntry: async (projectId: string, historyId: string): Promise<HistoryEntry> => {
    const res = await fetchWithAuth(
      `/api/projects/${encodeURIComponent(projectId)}/history/${encodeURIComponent(historyId)}`
    )
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  /**
   * Restore the diagram to a specific history snapshot.
   */
  restoreSnapshot: async (projectId: string, historyId: string): Promise<void> => {
    const res = await fetchWithAuth(
      `/api/projects/${encodeURIComponent(projectId)}/history/${encodeURIComponent(historyId)}/restore`,
      { method: 'POST' }
    )
    if (!res.ok) throw new Error(await extractErrorMessage(res))
  },
}

// ─── Project Code API ─────────────────────────────────────────────────────

export interface CodeFileDto {
  id: string
  projectId: string
  filePath: string
  content: string
  language: string
  sizeBytes: number
  createdAt: string
  updatedAt: string
}

export interface CodeTreeNode {
  type: 'file' | 'folder'
  name: string
  filePath?: string
  content?: string
  language?: string
  children?: Record<string, CodeTreeNode>
}

export interface CodeTreeResponse {
  totalFiles: number
  totalSizeBytes: number
  tree: Record<string, CodeTreeNode>
}

export const projectCodeApi = {
  /**
   * Get the hierarchical file tree for a project's code.
   */
  getFileTree: async (projectId: string): Promise<CodeTreeResponse> => {
    const res = await fetchWithAuth(
      `/api/projects/${encodeURIComponent(projectId)}/code/tree`
    )
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  /**
   * Get all code files as a flat list.
   */
  getCodeFiles: async (projectId: string): Promise<CodeFileDto[]> => {
    const res = await fetchWithAuth(
      `/api/projects/${encodeURIComponent(projectId)}/code`
    )
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  /**
   * Download all code files as a ZIP archive.
   * Triggers a browser download.
   */
  downloadZip: async (projectId: string, projectName?: string): Promise<void> => {
    const res = await fetchWithAuth(
      `/api/projects/${encodeURIComponent(projectId)}/code/download`
    )
    if (!res.ok) throw new Error(await extractErrorMessage(res))

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName || 'project'}-code.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  },
}

// ─── Docker Execution API ──────────────────────────────────────────────────

export interface DockerStatusResponse {
  status: 'BUILDING' | 'RUNNING' | 'STOPPED' | 'FAILED'
  previewUrl?: string
}

export const dockerApi = {
  startDocker: async (projectId: string): Promise<DockerStatusResponse> => {
    const res = await fetchWithAuth(`/api/projects/${encodeURIComponent(projectId)}/docker/start`, {
      method: 'POST'
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  stopDocker: async (projectId: string): Promise<void> => {
    const res = await fetchWithAuth(`/api/projects/${encodeURIComponent(projectId)}/docker/stop`, {
      method: 'POST'
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res))
  },

  restartDocker: async (projectId: string): Promise<DockerStatusResponse> => {
    const res = await fetchWithAuth(`/api/projects/${encodeURIComponent(projectId)}/docker/restart`, {
      method: 'POST'
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  },

  getDockerStatus: async (projectId: string): Promise<DockerStatusResponse> => {
    const res = await fetchWithAuth(`/api/projects/${encodeURIComponent(projectId)}/docker/status`)
    if (!res.ok) throw new Error(await extractErrorMessage(res))
    return res.json()
  }
}
