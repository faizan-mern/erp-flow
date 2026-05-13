import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register']
const PROTECTED_PREFIX = '/dashboard'

export function middleware(req: NextRequest) {
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
