import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
const publicPaths = [
  '/auth/signin',
  '/auth/signup', 
  '/auth/verify-email',
  '/auth/verify-success',
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check for authentication token
  const token = request.cookies.get('access_token');
  
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