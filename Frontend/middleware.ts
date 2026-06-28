import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require the user to be authenticated
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/settings',
  '/projects',
  '/git',
  '/notifications',
]

// Routes that authenticated users should not visit (redirect to dashboard)
const AUTH_ROUTES = ['/auth']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Read auth from the persisted zustand localStorage key.
  // Zustand persist stores the value in a cookie mirror for SSR via the
  // 'codeevo-auth' key. We read it from a cookie we set below.
  // Because localStorage is not accessible in middleware (edge runtime),
  // we rely on a lightweight cookie-based signal: when the auth store
  // is populated we also set a `codeevo_authed=1` cookie (see auth-store).
  // This avoids leaking the actual token to the middleware.
  const authedCookie = request.cookies.get('codeevo_authed')
  const isAuthed = authedCookie?.value === '1'

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  )
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  if (isProtected && !isAuthed) {
    const loginUrl = new URL('/auth', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && isAuthed && !pathname.startsWith('/auth/github/callback')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, public assets
     * - api routes (handled by rewrites / backend)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo|grid|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
}
