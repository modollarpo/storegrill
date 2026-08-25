import { NextRequest, NextResponse } from 'next/server';

export const middleware = (request: NextRequest): NextResponse => {
  const { pathname } = request.nextUrl;

  if (pathname === '/login') return NextResponse.next();

  const token = request.cookies.get('accessToken');

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
};

export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
};
