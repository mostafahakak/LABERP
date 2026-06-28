import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api', '/_next', '/favicon.ico', '/logo.png', '/icon.png', '/apple-icon.png'];

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname === '/') {
    return NextResponse.next();
  }

  // Check auth cookie set by the client on login
  const uid = request.cookies.get('UID')?.value;

  if (!uid) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
};
