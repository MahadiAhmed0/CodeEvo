import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import AuthPage from '@/app/auth/page'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'

const mockReplace = vi.fn()
const origLocation = window.location

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
}))

vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('lucide-react', () => ({
  Github: () => <svg data-testid="icon-github" />,
  ArrowRight: () => <svg data-testid="icon-arrow-right" />,
  Loader2: () => <svg data-testid="icon-loader" />,
}))

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
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

function getSubmitButton(container: HTMLElement) {
  const form = container.querySelector('form')!
  return within(form).getByRole('button')
}

describe('AuthPage', () => {
  it('renders login form by default with Welcome back heading', () => {
    render(<AuthPage />)
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeTruthy()
    expect(screen.getByText(/enter your credentials/i)).toBeTruthy()
  })

  it('toggles to Sign Up shows name fields and Create an account heading', () => {
    render(<AuthPage />)
    fireEvent.click(screen.getByText('Sign Up'))
    expect(screen.getByRole('heading', { name: /create an account/i })).toBeTruthy()
    expect(screen.getByPlaceholderText('John')).toBeTruthy()
    expect(screen.getByPlaceholderText('Doe')).toBeTruthy()
  })

  it('successful login calls setAuth and navigates to dashboard', async () => {
    const authResponse = {
      accessToken: 'test-token',
      expiresIn: 3600,
      user: { id: '1', firstName: 'Test', lastName: 'User', email: 'test@test.com' },
    }
    authApi.login.mockResolvedValue(authResponse)

    const { container } = render(<AuthPage />)
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } })
    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password123' })
      expect(mockReplace).toHaveBeenCalledWith('/dashboard')
    })

    const { accessToken, user } = useAuthStore.getState()
    expect(accessToken).toBe('test-token')
    expect(user?.email).toBe('test@test.com')
  })

  it('failed login shows error message', async () => {
    authApi.login.mockRejectedValue(new Error('Invalid credentials'))

    const { container } = render(<AuthPage />)
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'wrong' } })
    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeTruthy()
    })
  })

  it('empty name fields on sign-up show validation error', async () => {
    const { container } = render(<AuthPage />)
    fireEvent.click(screen.getByText('Sign Up'))
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'pass123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'pass123' } })
    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => {
      expect(screen.getByText(/please enter your first and last name/i)).toBeTruthy()
    })
  })

  it('password mismatch on sign-up shows error', async () => {
    const { container } = render(<AuthPage />)
    fireEvent.click(screen.getByText('Sign Up'))
    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'pass123' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'different' } })
    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeTruthy()
    })
  })

  it('Google OAuth shows toast', () => {
    render(<AuthPage />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    expect(toast.info).toHaveBeenCalledWith(
      'Google OAuth is coming soon! Please sign in with email for now.'
    )
  })

  it('GitHub OAuth redirects window', () => {
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID = 'test-client-id'
    render(<AuthPage />)
    fireEvent.click(screen.getByRole('button', { name: /continue with github/i }))
    expect(window.location.href).toContain('https://github.com/login/oauth/authorize')
    expect(window.location.href).toContain('client_id=test-client-id')
  })

  it('loading state shows spinner on submit button', async () => {
    authApi.login.mockImplementation(() => new Promise(() => {}))

    const { container } = render(<AuthPage />)
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'pass' } })
    fireEvent.submit(container.querySelector('form')!)

    const submitBtn = within(container.querySelector('form')!).getByRole('button')
    expect(submitBtn.querySelector('[data-testid="icon-loader"]')).toBeTruthy()
  })
})
