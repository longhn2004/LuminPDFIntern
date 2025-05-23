import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import api from '@/libs/api/axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await api.post('/auth/login', body);
    const nextResponse = NextResponse.json(response.data);

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
  } catch (error: any) {
    console.error('Login API error:', error.response?.data || error.message);
    
    if (error.response) {
      return NextResponse.json(
        { message: error.response.data.message || 'Login failed' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 