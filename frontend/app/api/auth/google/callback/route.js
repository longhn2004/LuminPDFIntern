import { NextResponse } from 'next/server';
import axios from 'axios';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';

// Configuration for axios to include credentials
import api from '@/libs/api/axios';

export async function GET(request) {
  // Extract authorization code from URL
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  
  // If there's an error in the OAuth flow
  if (error) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  
  try {
    // Call the backend Google callback endpoint
    const backendUrl = process.env.NEXT_APP_BACKEND_URL || 'http://localhost:5000';
    const response = await axios.get(`${backendUrl}/api/auth/google/callback`, {
      params: { code },
      withCredentials: true,
      maxRedirects: 0, // Prevent auto-following redirects
      validateStatus: status => status >= HTTP_STATUS.OK && status < HTTP_STATUS.INTERNAL_SERVER_ERROR, // Accept all responses except server errors
    });
    
    // If successful, set the cookies and redirect to dashboard
    if (response.status === HTTP_STATUS.OK || response.status === HTTP_STATUS.FOUND) {
      // Extract cookies from backend response
      const cookies = response.headers['set-cookie'];
      const nextResponse = NextResponse.redirect(new URL('/dashboard/document-list', request.url));
      
      // Forward cookies if they exist
      if (cookies && Array.isArray(cookies)) {
        cookies.forEach(cookie => {
          const [cookieName, ...rest] = cookie.split('=');
          const cookieValue = rest.join('=').split(';')[0];
          
          nextResponse.cookies.set({
            name: cookieName,
            value: cookieValue,
            httpOnly: cookie.includes('HttpOnly'),
            secure: cookie.includes('Secure'),
            sameSite: cookie.includes('SameSite=Lax') ? 'lax' : 'strict',
            path: '/',
          });
        });
      }
      
      return nextResponse;
    }
    
    return NextResponse.redirect(new URL('/dashboard/document-list', request.url));
    
  } catch (error) {
    console.error('Google callback error:', error.response?.data || error.message);
    
    // Handle email/password conflict - User already registered with email/password
    if (error.response?.status === HTTP_STATUS.CONFLICT && error.response?.data?.message?.includes('email and password')) {
      return NextResponse.redirect(
        new URL('/auth/signin?verification=conflictemail', request.url)
      );
    }
    
    // Generic error - redirect to signin page
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
} 