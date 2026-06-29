import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authed = request.cookies.has('hfa_auth');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  if (isApiRoute) return NextResponse.next();

  if (!authed && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (authed && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard/ipo', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|manifest.json|sw.js|icons).*)'],
};
