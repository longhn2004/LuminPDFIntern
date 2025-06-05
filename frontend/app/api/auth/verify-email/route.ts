import { NextRequest, NextResponse } from 'next/server';
import api from '@/libs/api/axios';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import { AxiosError } from 'axios';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { message: 'Verification token is required' }, 
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
    
    const response = await api.get(`/auth/verify-email?token=${token}`);


    // Create a response that will redirect to the success page
    const nextResponse = NextResponse.json(response.data);

    // Set cookies from the backend response
    if (response.headers['set-cookie']) {
      const cookies = response.headers['set-cookie'];
      
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Email verification error:', error.message);
    } else {
      console.error('Email verification error:', String(error));
    }
    
    if (error instanceof AxiosError && error.response) {
      const message = error.response.data?.message || 'Email verification failed';
      return NextResponse.redirect(
        new URL(`/auth/verify-error?message=${encodeURIComponent(message)}`, request.url)
      );
    }
    
    return NextResponse.redirect(
      new URL(`/auth/verify-error?message=${encodeURIComponent('Email verification failed')}`, request.url)
    );
  }
} 