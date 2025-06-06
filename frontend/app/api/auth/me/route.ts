import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import api from '@/libs/api/axios';
import { AxiosError } from 'axios';
export async function GET(request: NextRequest) {
  try {
    // Extract cookie and authorization header from the request
    const cookieHeader = request.headers.get('cookie');
    const authHeader = request.headers.get('authorization');
    
    // Extract token from cookie if no auth header is present
    let token = null;
    if (!authHeader && cookieHeader) {
      const accessTokenMatch = cookieHeader.match(/access_token=([^;]+)/);
      if (accessTokenMatch && accessTokenMatch[1]) {
        token = accessTokenMatch[1];
      }
    }
    
    // Call the backend API with proper headers
    const response = await api.get('/auth/me', {
      headers: {
        ...(cookieHeader && { Cookie: cookieHeader }),
        // Use either the existing auth header or create one from the token
        Authorization: authHeader || (token && `Bearer ${token}`),
      },
    });
    
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Get current user API error:', error.message);
    } else {
      console.error('Get current user API error:', String(error));
    }
    
    if (error instanceof AxiosError && error.response) {
      return NextResponse.json(
        { message: error.response.data.message || 'Failed to get user data' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
        { message: 'Internal server error' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 