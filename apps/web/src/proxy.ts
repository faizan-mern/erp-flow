import { NextRequest, NextResponse } from 'next/server'

// Renamed from `middleware.ts` in Next 16: the new term is `proxy`.
// The exported function must be called `proxy` (not `middleware`).
// Runtime behavior + matcher config are unchanged from the old middleware API.

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']
const PROTECTED_PREFIX = '/dashboard'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const hasSession = req.cookies.has('refreshToken')

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  const isProtectedRoute = pathname.startsWith(PROTECTED_PREFIX)

  if (isProtectedRoute && !hasSession) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isPublicRoute && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
