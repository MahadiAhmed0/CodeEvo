import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AgentChat } from '@/components/agent-chat'

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

vi.mock('framer-motion', () => {
  const motionTag = (props: any) => {
    const { initial, animate, exit, transition, children, ...rest } = props
    return <div {...rest}>{children}</div>
  }
  return {
    motion: new Proxy({}, { get: () => motionTag }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  }
})

vi.mock('react-markdown', () => ({
  default: ({ children }: any) => <>{children}</>,
}))

vi.mock('remark-gfm', () => ({ default: () => {} }))

const mockConnect = vi.fn()
const mockSendMessage = vi.fn()
const mockSendFeedback = vi.fn()
const mockStopAgent = vi.fn()

let mockIsConnected = false
let mockIsAgentRunning = false
let mockActiveAgent: string | null | undefined = null
let mockEvents: any[] = []
let mockUserMessages: any[] = []

const mockGetState = vi.fn()

vi.mock('@/lib/agent-store', () => ({
  useAgentStore: () => ({
    isConnected: mockIsConnected,
    isAgentRunning: mockIsAgentRunning,
    activeAgent: mockActiveAgent,
    events: mockEvents,
    userMessages: mockUserMessages,
    connect: mockConnect,
    sendMessage: mockSendMessage,
    sendFeedback: mockSendFeedback,
    stopAgent: mockStopAgent,
  }),
}))

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: { getState: () => ({ accessToken: 'tok-123' }) },
}))

describe('AgentChat', () => {
  const setIsOpen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsConnected = false
    mockIsAgentRunning = false
    mockActiveAgent = null
    mockEvents = []
    mockUserMessages = []
  })

  it('when closed, shows the floating "Agent" button', () => {
    render(<AgentChat isOpen={false} setIsOpen={setIsOpen} sessionId="sess-1" projectId="proj-1" />)
    expect(screen.getByText('Agent')).toBeTruthy()
  })

  it('clicking the button opens the chat panel', () => {
    render(<AgentChat isOpen={false} setIsOpen={setIsOpen} sessionId="sess-1" projectId="proj-1" />)
    fireEvent.click(screen.getByText('Agent'))
    expect(setIsOpen).toHaveBeenCalledWith(true)
  })

  it('shows chat header with connection status', () => {
    mockIsConnected = true
    render(<AgentChat isOpen={true} setIsOpen={setIsOpen} sessionId="sess-1" projectId="proj-1" />)
    expect(screen.getByText('CodeEvo Agent')).toBeTruthy()
    expect(screen.getByText('Ready')).toBeTruthy()
  })

  it('sends message when typing and clicking Send', async () => {
    mockIsConnected = true
    mockIsAgentRunning = false
    render(<AgentChat isOpen={true} setIsOpen={setIsOpen} sessionId="sess-1" projectId="proj-1" />)
    const textarea = screen.getByPlaceholderText('Ask anything...')
    fireEvent.change(textarea, { target: { value: 'Hello agent' } })
    const sendButton = textarea.parentElement?.querySelector('button')
    expect(sendButton).toBeTruthy()
    fireEvent.click(sendButton!)
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Hello agent')
    })
  })

  it('shows welcome message on first load', async () => {
    mockIsConnected = true
    render(<AgentChat isOpen={true} setIsOpen={setIsOpen} sessionId="sess-1" projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText(/Hello! I'm CodeEvo Chat AI/)).toBeTruthy()
    })
  })

  it('renders user messages', async () => {
    mockIsConnected = true
    mockUserMessages = [{ id: 'um-1', content: 'Build a user service', timestamp: Date.now() }]
    render(<AgentChat isOpen={true} setIsOpen={setIsOpen} sessionId="sess-1" projectId="proj-1" />)
    await waitFor(() => {
      expect(screen.getByText('Build a user service')).toBeTruthy()
    })
  })

  it('shows agent working state via collapsible header and disabled input', () => {
    mockIsConnected = true
    mockIsAgentRunning = true
    mockActiveAgent = 'CODING'
    render(<AgentChat isOpen={true} setIsOpen={setIsOpen} sessionId="sess-1" projectId="proj-1" />)
    expect(screen.getByText('Working...')).toBeTruthy()
    expect(screen.getByPlaceholderText('Agent is working...')).toBeTruthy()
    expect(screen.getByText('Coding Agent')).toBeTruthy()
  })
})
