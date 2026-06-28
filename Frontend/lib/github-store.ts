import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface GitHubUser {
  login: string
  avatarUrl: string
  id: string
  profileUrl?: string
  connectedAt?: string
}

interface GitHubState {
  connected: boolean
  githubUser: GitHubUser | null
  githubToken: string | null

  setConnected: (connected: boolean, user: GitHubUser | null, token: string | null) => void
  disconnect: () => void
}

export const useGitHubStore = create<GitHubState>()(
  persist(
    (set) => ({
      connected: false,
      githubUser: null,
      githubToken: null,

      setConnected: (connected, githubUser, githubToken) => set({ connected, githubUser, githubToken }),
      disconnect: () => set({ connected: false, githubUser: null, githubToken: null }),
    }),
    {
      name: 'codeevo-github',
      partialize: (state) => ({
        connected: state.connected,
        githubUser: state.githubUser,
        githubToken: state.githubToken,
      }),
    }
  )
)
