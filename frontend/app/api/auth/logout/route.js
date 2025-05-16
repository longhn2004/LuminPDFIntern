import { NextResponse } from 'next/server';
import axios from 'axios';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import api from '@/libs/api/axios';

export async function POST(request) {
  try {
    // Extract cookies from the request to forward to backend
    const cookieHeader = request.headers.get('cookie');
    
    // Call the backend logout endpoint
    // await api.post('/auth/logout', {}, {
    //   headers: {
    //     ...(cookieHeader && { Cookie: cookieHeader }),
    //   },
    // });
    
    // Create response and clear the cookie
    const response = NextResponse.json({ message: 'Logged out successfully' });
    
    // Clear the access token cookie
    response.cookies.delete('access_token');
    
    return response;
  } catch (error) {
    console.error('Logout API error:', error.response?.data || error.message);
    
    // Even if the backend call fails, clear the cookie on the frontend
    const response = NextResponse.json(
      { message: 'Logged out from client' },
      { status: HTTP_STATUS.OK }
    );
    
    response.cookies.delete('access_token');
    
    return response;
  }
} 