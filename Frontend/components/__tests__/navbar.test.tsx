import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Navbar } from '@/components/navbar'

const { mockReplace } = vi.hoisted(() => ({ mockReplace: vi.fn() }))
const { mockClearAuth } = vi.hoisted(() => ({ mockClearAuth: vi.fn() }))
const { mockSetConnected } = vi.hoisted(() => ({ mockSetConnected: vi.fn() }))
const { mockLogout } = vi.hoisted(() => ({ mockLogout: vi.fn() }))
const { mockGetStatus } = vi.hoisted(() => ({ mockGetStatus: vi.fn() }))
const { mockLogin } = vi.hoisted(() => ({ mockLogin: vi.fn() }))

vi.mock('next/image', () => ({ default: (props: any) => <img {...props} /> }))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: () => ({
    user: { firstName: 'Test', lastName: 'User', email: 'test@example.com' },
    clearAuth: mockClearAuth,
  }),
}))

vi.mock('@/lib/github-store', () => ({
  useGitHubStore: () => ({
    connected: false,
    githubUser: null,
    setConnected: mockSetConnected,
  }),
}))

vi.mock('@/lib/api', () => ({
  authApi: { logout: mockLogout },
  userApi: { avatarUrl: () => '/avatar.jpg' },
  githubAuthApi: { getStatus: mockGetStatus, login: mockLogin },
}))

vi.mock('@/components/notifications-popover', () => ({
  NotificationsPopover: () => <div data-testid="notifications-popover" />,
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: any) =>
    asChild && children?.props?.children ? <>{children.props.children}</> : <button>{children}</button>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, ...props }: any) => (
    <div data-testid="dropdown-item" onClick={onClick} {...props}>{children}</div>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
}))

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStatus.mockResolvedValue({ connected: false })
  })

  it('renders logo, search bar, notifications popover, settings icon', () => {
    render(<Navbar />)
    expect(document.querySelector('img[alt="CodeEvo"]')).toBeTruthy()
    expect(screen.getByPlaceholderText(/search/i)).toBeTruthy()
    expect(screen.getByTestId('notifications-popover')).toBeTruthy()
    expect(document.querySelector('a[href="/settings"]')).toBeTruthy()
  })

  it('shows user initials from auth store', () => {
    render(<Navbar />)
    const initials = screen.getAllByText('T')
    expect(initials.length).toBeGreaterThanOrEqual(1)
  })

  it('dropdown menu shows user name, email, Profile Settings, Sign out', () => {
    render(<Navbar />)
    expect(screen.getByText('Test User')).toBeTruthy()
    expect(screen.getByText('test@example.com')).toBeTruthy()
    expect(screen.getByText('Profile Settings')).toBeTruthy()
    expect(screen.getByText('Sign out')).toBeTruthy()
    expect(screen.getByText('Connect GitHub')).toBeTruthy()
  })

  it('logout calls clearAuth and navigates to /auth', async () => {
    mockLogout.mockResolvedValue(undefined)
    render(<Navbar />)
    const signOutItem = screen.getAllByText('Sign out')
    fireEvent.click(signOutItem[0])
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled()
      expect(mockClearAuth).toHaveBeenCalled()
      expect(mockReplace).toHaveBeenCalledWith('/auth')
    })
  })

  it('checks GitHub status on mount', async () => {
    render(<Navbar />)
    await waitFor(() => {
      expect(mockGetStatus).toHaveBeenCalled()
    })
  })
})
