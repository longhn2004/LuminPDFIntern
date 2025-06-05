import { NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
export async function POST() {
  try {
    // Create response and clear the cookie
    const response = NextResponse.json({ message: 'Logged out successfully' });
    
    // Clear the access token cookie
    response.cookies.delete('access_token');
    
    return response;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Logout API error:', error.message);
    } else {
      console.error('Logout API error:', String(error));
    }
    
    // Even if the backend call fails, clear the cookie on the frontend
    const response = NextResponse.json(
      { message: 'Logged out from client' },
      { status: HTTP_STATUS.OK }
    );
    
    response.cookies.delete('access_token');
    
    return response;
  }
} 