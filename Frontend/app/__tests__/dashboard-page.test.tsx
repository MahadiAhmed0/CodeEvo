import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import DashboardPage from '@/app/dashboard/page'
import { projectApi } from '@/lib/api'
import { useGitHubStore } from '@/lib/github-store'

const mockPush = vi.fn()
const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

vi.mock('lucide-react', () => ({
  Activity: () => <svg data-testid="icon-activity" />,
  TrendingUp: () => <svg data-testid="icon-trending-up" />,
  GitBranch: () => <svg data-testid="icon-git-branch" />,
  Zap: () => <svg data-testid="icon-zap" />,
  Plus: () => <svg data-testid="icon-plus" />,
  ArrowRight: () => <svg data-testid="icon-arrow-right" />,
  FolderOpen: () => <svg data-testid="icon-folder-open" />,
  Server: () => <svg data-testid="icon-server" />,
  GitCommit: () => <svg data-testid="icon-git-commit" />,
  XIcon: () => <svg data-testid="icon-x" />,
}))

vi.mock('@/components/navbar', () => ({
  Navbar: () => <div data-testid="navbar-mock" />,
}))

vi.mock('@/lib/api', () => ({
  projectApi: {
    listProjects: vi.fn(),
    getDashboardStats: vi.fn(),
    createProject: vi.fn(),
  },
  githubRepoApi: {
    getLinkedRepo: vi.fn(),
    listRepos: vi.fn(),
    listBranches: vi.fn(),
    linkProject: vi.fn(),
    unlinkProject: vi.fn(),
    listLinkedRepos: vi.fn(),
    getFileContent: vi.fn(),
  },
  githubCommitApi: {
    listCommits: vi.fn(),
    getCommit: vi.fn(),
    compareCommits: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  useGitHubStore.setState({ connected: false, githubUser: null, githubToken: null })
})

describe('DashboardPage', () => {
  it('renders dashboard heading and Navbar', async () => {
    projectApi.listProjects.mockResolvedValue({ content: [] })
    projectApi.getDashboardStats.mockResolvedValue({})

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeTruthy()
      expect(screen.getByTestId('navbar-mock')).toBeTruthy()
    })
  })

  it('fetches and displays projects and stats on mount', async () => {
    const mockProjects = [
      { id: '1', name: 'Project Alpha', status: 'active', updatedAt: new Date().toISOString(), description: 'First project', serviceCount: 3 },
      { id: '2', name: 'Project Beta', status: 'inactive', updatedAt: new Date().toISOString(), description: 'Second project', serviceCount: 1 },
    ]
    const mockStats = { totalProjects: 10, activeProjects: 7, totalServiceNodes: 25 }

    projectApi.listProjects.mockResolvedValue({ content: mockProjects })
    projectApi.getDashboardStats.mockResolvedValue(mockStats)

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeTruthy()
      expect(screen.getByText('Project Beta')).toBeTruthy()
    })

    expect(screen.getByText('10')).toBeTruthy()
    expect(screen.getByText('7')).toBeTruthy()
    expect(screen.getByText('25')).toBeTruthy()
  })

  it('shows No projects yet when projects list is empty', async () => {
    projectApi.listProjects.mockResolvedValue({ content: [] })
    projectApi.getDashboardStats.mockResolvedValue({})

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/no projects yet/i)).toBeTruthy()
    })
  })

  it('shows Connect GitHub to see commit activity when not connected', async () => {
    projectApi.listProjects.mockResolvedValue({ content: [] })
    projectApi.getDashboardStats.mockResolvedValue({})

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/connect github to see commit activity/i)).toBeTruthy()
    })
  })

  it('opens create project dialog, fills fields, creates project', async () => {
    projectApi.listProjects.mockResolvedValue({ content: [] })
    projectApi.getDashboardStats.mockResolvedValue({})
    projectApi.createProject.mockResolvedValue({ id: 'new-id' })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(projectApi.listProjects).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: /new project/i }))

    await waitFor(() => {
      expect(screen.getByText(/set up a new project workspace/i)).toBeTruthy()
    })

    const nameInput = screen.getByLabelText(/project name/i)
    fireEvent.change(nameInput, { target: { value: 'My Test Project' } })

    const descInput = document.querySelector('textarea')
    expect(descInput).toBeTruthy()
    if (descInput) {
      fireEvent.change(descInput, { target: { value: 'A test project description' } })
    }

    const createBtn = screen.getByRole('button', { name: /^create project$/i })
    fireEvent.click(createBtn)

    await waitFor(() => {
      expect(projectApi.createProject).toHaveBeenCalledWith('My Test Project', 'A test project description')
      expect(mockPush).toHaveBeenCalledWith('/new-id')
    })
  })
})
