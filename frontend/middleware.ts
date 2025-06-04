import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
const publicPaths = [
  '/auth/signin',
  '/auth/signup', 
  '/auth/verify-email',
  '/auth/verify-success',
  '/auth/verify-error',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/resend-verification',
  '/api/auth/verify-email',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/notfound'
];

// Auth pages that should redirect to document-list if user is logged in
const authPages = [
  '/auth/signin',
  '/auth/signup',
  '/',  // Root path should redirect to document-list if logged in
];

// Valid routes in the application
const validRoutes = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/verify-email',
  '/auth/verify-success', 
  '/auth/verify-error',
  '/dashboard/document-list',
  '/dashboard/viewpdf',
  '/share',
  '/notfound',
  '/api'
];

// Check if the path is a public path or starts with one of the public paths
const isPublicPath = (path: string) => {
  return publicPaths.some(publicPath => 
    path === publicPath || 
    path.startsWith(`${publicPath}/`) ||
    path.includes('images/') ||
    path === '/_next' ||
    path.startsWith('/_next/')
  );
};

// Check if the path is an auth page that should redirect if logged in
const isAuthPage = (path: string) => {
  return authPages.some(authPage => path === authPage);
};

// Check if the path is a valid route
const isValidRoute = (path: string) => {
  // Allow Next.js internal paths
  if (path.startsWith('/_next/') || path === '/_next' || 
      path.includes('favicon.ico') || path.includes('images/') ||
      path.startsWith('/api/')) {
    return true;
  }

  // Check if path matches any valid route exactly or starts with a valid route
  return validRoutes.some(route => {
    if (route === '/') {
      return path === '/';
    }
    if (route === '/api') {
      return path.startsWith('/api/');
    }
    if (route === '/dashboard/viewpdf') {
      return path.startsWith('/dashboard/viewpdf/');
    }
    return path === route || path.startsWith(`${route}/`);
  });
};

/**
 * Middleware function to handle authentication and API request forwarding
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check for authentication token
  const token = request.cookies.get('access_token');

  // Check if route is valid first (before authentication checks)
  if (!isValidRoute(pathname)) {
    return NextResponse.redirect(new URL('/notfound', request.url));
  }

  // If user is logged in and tries to access auth pages, redirect to document-list
  if (token && isAuthPage(pathname)) {
    return NextResponse.redirect(new URL('/dashboard/document-list', request.url));
  }

  // Allow access to public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // If token doesn't exist, redirect to login
  if (!token) {
    const url = new URL('/auth/signin', request.url);
    return NextResponse.redirect(url);
  }
  
  // If token exists, allow access to the protected route and add Authorization header
  const response = NextResponse.next();
  
  // Add Authorization header with Bearer token for API requests
  // This will ensure the token is included in requests to the backend
  response.headers.set('Authorization', `Bearer ${token.value}`);
  
  return response;
}

// Configure paths the middleware will run on
export const config = {
  matcher: [
    // Match all paths except static files and api routes that don't need protection
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 