import { NextResponse } from 'next/server';

export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get('token')?.value;

  if (pathname.startsWith('/dashboard') && pathname !== '/dashboard/login') {
    if (!token) {
      const url = new URL('/dashboard/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname === '/dashboard/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard'],
};
