import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

async function readSession(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as any;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Always log to make sure middleware is running
  console.log(`[Middleware] Processing: ${pathname}`);

  // Skip middleware for static files and API routes
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api') ||
      pathname.startsWith('/favicon.ico')) {
    console.log(`[Middleware] Skipping: ${pathname}`);
    return NextResponse.next();
  }

  const sess = await readSession(req);

  // Debug logging
  console.log(`[Middleware] Path: ${pathname}, Session exists: ${!!sess}, User role: ${sess?.role || 'none'}`);

  // Define public routes (accessible without authentication)
  const publicRoutes = ['/', '/signin'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // If user is authenticated and tries to access public routes, redirect to dashboard
  if (sess && isPublicRoute) {
    console.log(`[Middleware] Redirecting authenticated user from ${pathname} to /dashboard`);
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // If user is not authenticated and tries to access protected routes, redirect to signin
  if (!sess && !isPublicRoute) {
    console.log(`[Middleware] Redirecting unauthenticated user from ${pathname} to /signin`);
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  // For authenticated users accessing protected routes, check admin permissions
  if (sess && (pathname.startsWith('/admin') || pathname.startsWith('/api/admin/'))) {
    if (sess.role !== 'admin') {
      console.log(`[Middleware] Access denied: user ${sess.email} is not admin`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  console.log(`[Middleware] Allowing access to: ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};