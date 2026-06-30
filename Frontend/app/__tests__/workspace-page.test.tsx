import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjectPage from '@/app/[project]/page'
import { useDiagramStore } from '@/lib/store'

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    use: vi.fn(() => ({ project: 'test-project' })),
  }
})

vi.mock('@/components/navbar', () => ({
  Navbar: () => <div data-testid="navbar">Navbar</div>,
}))

vi.mock('@/components/sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}))

vi.mock('@/components/canvas', () => ({
  Canvas: () => <div data-testid="canvas">Canvas</div>,
}))

vi.mock('@/components/agent-chat', () => ({
  AgentChat: () => <div data-testid="agent-chat">AgentChat</div>,
}))

vi.mock('@/components/agent-sidebar', () => ({
  AgentSidebar: () => <div data-testid="agent-sidebar">AgentSidebar</div>,
}))

vi.mock('@/components/project-settings-modal', () => ({
  ProjectSettingsModal: () => <div data-testid="project-settings-modal" />,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('ProjectPage (workspace)', () => {
  beforeEach(() => {
    useDiagramStore.setState({
      isChatbotExpanded: false,
      viewMode: 'graph',
      nodes: [],
      edges: [],
      selectedNode: null,
      dockerStatus: 'STOPPED',
      dockerLogs: [],
      dockerProblems: [],
      previewUrl: null,
    })
  })

  it('renders Navbar, Sidebar, Canvas, AgentChat, AgentSidebar in graph mode', () => {
    render(<ProjectPage params={Promise.resolve({ project: 'test-project' })} />)

    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
    expect(screen.getByTestId('agent-chat')).toBeInTheDocument()
    expect(screen.getByTestId('agent-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('project-settings-modal')).toBeInTheDocument()
  })

  it('hides Sidebar and AgentSidebar when viewMode is not graph', () => {
    useDiagramStore.setState({ viewMode: 'code' })

    render(<ProjectPage params={Promise.resolve({ project: 'test-project' })} />)

    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
    expect(screen.getByTestId('agent-chat')).toBeInTheDocument()

    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
    expect(screen.queryByTestId('agent-sidebar')).not.toBeInTheDocument()
  })
})
