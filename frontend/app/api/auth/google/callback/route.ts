import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';

// Configuration for axios to include credentials
import api from '@/libs/api/axios';
import { AxiosError } from 'axios';

export async function GET(request: NextRequest) {
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
    const response = await api.get(`${backendUrl}/auth/google/callback`, {
      params: { code },
      withCredentials: true,
      validateStatus: status => status >= HTTP_STATUS.OK && status < HTTP_STATUS.INTERNAL_SERVER_ERROR,
    });
    
    // If successful, extract the access token and set cookie
    if (response.status === HTTP_STATUS.CONFLICT && response.data?.message?.includes('email and password')) {
      return NextResponse.redirect(
        new URL('/auth/signin?verification=conflictemail', request.url)
      );
    }
    if (response.status === HTTP_STATUS.OK && response.data?.accessToken) {
      const { accessToken } = response.data;
      const nextResponse = NextResponse.redirect(new URL('/dashboard/document-list', request.url));
      
      // Set the authentication cookie
      // const isProduction = process.env.NODE_ENV === 'production';
      nextResponse.cookies.set({
        name: 'access_token',
        value: accessToken,
        httpOnly: false,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 30 * 60 * 1000, // 30 minutes
      });
      
      console.log('Google callback success - Cookie set and redirecting to dashboard');
      return nextResponse;
    }
    
    // Fallback redirect if no access token
    console.log('Google callback - No access token received, redirecting to signin');
    return NextResponse.redirect(new URL('/auth/signin', request.url));
    
  } catch (error: unknown) {
    console.log('Google callback test error:', error);
    if (error instanceof Error) {
      console.error('Google callback error:', error.message);
    } else {
      console.error('Google callback error:', String(error));
    }
    
    // Handle email/password conflict - User already registered with email/password
    if (error instanceof AxiosError && error.response?.status === HTTP_STATUS.CONFLICT && error.response?.data?.message?.includes('email and password')) {
      return NextResponse.redirect(
        new URL('/auth/signin?verification=conflictemail', request.url)
      );
    }
    
    // Generic error - redirect to signin page
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
} 