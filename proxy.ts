import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: unknown } }) {
    const { pathname } = req.nextUrl;

    const isPublicApiRoute = pathname.startsWith('/api/auth');

    if (isPublicApiRoute) {
      return NextResponse.next();
    }

    if (pathname.startsWith('/api')) {
      if (!req.nextauth.token) {
        return NextResponse.json(
          { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
          { status: 401 }
        );
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        const publicRoutes = ['/sign-in', '/sign-up'];
        const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

        const isPublicApiRoute = pathname.startsWith('/api/auth');

        if (isPublicRoute || isPublicApiRoute) {
          return true;
        }

        const dashboardRoutes = [
          '/employees',
          '/leave-requests',
          '/requests',
        ];
        const isDashboardRoute = pathname === '/' || dashboardRoutes.some(route => pathname.startsWith(route));
        const isApiRoute = pathname.startsWith('/api');

        if (!isDashboardRoute && !isApiRoute) {
          return true;
        }

        return !!token;
      },
    },
    pages: {
      signIn: '/sign-in',
    },
  }
);

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)',
  ],
};

