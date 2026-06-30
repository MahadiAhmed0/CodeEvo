import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GitVisualizationPage from '@/app/git/page'
import { useGitHubStore } from '@/lib/github-store'

vi.mock('@/lib/api', () => ({
  githubCommitApi: {
    listCommits: vi.fn(),
    getCommit: vi.fn(),
  },
  githubRepoApi: {
    listLinkedRepos: vi.fn(),
    listBranches: vi.fn(),
  },
  projectApi: {
    listProjects: vi.fn(),
    getDiagram: vi.fn(),
  },
}))

vi.mock('@/components/navbar', () => ({
  Navbar: () => <div data-testid="navbar">Navbar</div>,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

const mockRepo = {
  projectId: 'p1',
  fullName: 'owner/my-repo',
  repoOwner: 'owner',
  repoName: 'my-repo',
  defaultBranch: 'main',
  activeBranch: 'main',
  lastPushedCommitSha: null,
  lastPushedAt: null,
  linkedAt: new Date().toISOString(),
}

const mockCommits = [
  {
    sha: 'abc123def456',
    message: 'Initial commit',
    author: 'Developer',
    date: new Date(Date.now() - 3600000).toISOString(),
    files: [{ filename: 'src/main.ts', status: 'added', additions: 15, deletions: 0 }],
    stats: { additions: 15, deletions: 0, total: 1 },
  },
  {
    sha: '789def456abc',
    message: 'Fix login bug',
    author: 'Developer',
    date: new Date(Date.now() - 7200000).toISOString(),
  },
]

describe('GitVisualizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useGitHubStore.setState({
      connected: true,
      githubUser: null,
      githubToken: null,
    })
  })

  it('renders Git Timeline heading and Navbar', () => {
    render(<GitVisualizationPage />)

    expect(screen.getByText('Git Timeline')).toBeInTheDocument()
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<GitVisualizationPage />)

    expect(screen.getByText('Loading commits...')).toBeInTheDocument()
  })

  it('displays commits after loading', async () => {
    const { githubRepoApi, projectApi, githubCommitApi } = await import('@/lib/api')
    vi.mocked(githubRepoApi.listLinkedRepos).mockResolvedValue([mockRepo])
    vi.mocked(projectApi.listProjects).mockResolvedValue({ content: [] })
    vi.mocked(githubRepoApi.listBranches).mockResolvedValue([{ name: 'main' }])
    vi.mocked(githubCommitApi.listCommits).mockResolvedValue(mockCommits)
    vi.mocked(githubCommitApi.getCommit).mockResolvedValue({})
    vi.mocked(projectApi.getDiagram).mockResolvedValue(null)

    render(<GitVisualizationPage />)

    await waitFor(() => {
      expect(screen.getByText('Fix login bug')).toBeInTheDocument()
    })
    expect(screen.getAllByText('abc123d').length).toBe(2)
    expect(screen.getAllByText('Initial commit').length).toBe(2)
  })

  it('clicking a commit selects it and shows details', async () => {
    const { githubRepoApi, projectApi, githubCommitApi } = await import('@/lib/api')
    vi.mocked(githubRepoApi.listLinkedRepos).mockResolvedValue([mockRepo])
    vi.mocked(projectApi.listProjects).mockResolvedValue({ content: [] })
    vi.mocked(githubRepoApi.listBranches).mockResolvedValue([{ name: 'main' }])
    vi.mocked(githubCommitApi.listCommits).mockResolvedValue(mockCommits)
    vi.mocked(githubCommitApi.getCommit).mockResolvedValue({})
    vi.mocked(projectApi.getDiagram).mockResolvedValue(null)

    render(<GitVisualizationPage />)

    await waitFor(() => {
      expect(screen.getByText('Fix login bug')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Fix login bug'))

    await waitFor(() => {
      expect(screen.getAllByText('Fix login bug').length).toBe(2)
    })
  })

  it('shows error state on API failure', async () => {
    const { githubRepoApi, projectApi, githubCommitApi } = await import('@/lib/api')
    vi.mocked(githubRepoApi.listLinkedRepos).mockResolvedValue([mockRepo])
    vi.mocked(projectApi.listProjects).mockResolvedValue({ content: [] })
    vi.mocked(githubRepoApi.listBranches).mockResolvedValue([{ name: 'main' }])
    vi.mocked(githubCommitApi.listCommits).mockRejectedValue(
      new Error('Failed to load commits'),
    )

    render(<GitVisualizationPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load commits')).toBeInTheDocument()
    })
  })

  it('shows empty state when no commits', async () => {
    const { githubRepoApi, projectApi, githubCommitApi } = await import('@/lib/api')
    vi.mocked(githubRepoApi.listLinkedRepos).mockResolvedValue([mockRepo])
    vi.mocked(projectApi.listProjects).mockResolvedValue({ content: [] })
    vi.mocked(githubRepoApi.listBranches).mockResolvedValue([{ name: 'main' }])
    vi.mocked(githubCommitApi.listCommits).mockResolvedValue([])

    render(<GitVisualizationPage />)

    await waitFor(() => {
      expect(screen.getByText('No commits found')).toBeInTheDocument()
    })
  })
})
