import { NextRequest, NextResponse } from 'next/server';
import api from '@/libs/api/axios';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';

/**
 * GET endpoint to find a user by email
 * @param request - The incoming request with email query parameter
 * @returns User information or error
 */
export async function GET(request: NextRequest) {
  try {
    // Get email from query parameters
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    const cookieHeader = request.headers.get('cookie') || '';
    const accessTokenMatch = cookieHeader.match(/access_token=([^;]+)/);
    const accessToken = accessTokenMatch ? accessTokenMatch[1] : null;

    if (!accessToken) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: HTTP_STATUS.UNAUTHORIZED }
        );
    }

    
    // Forward request to backend API using Axios
    const response = await api.get(`/auth/user-by-email`, {
      params: { email },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error searching for user:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 