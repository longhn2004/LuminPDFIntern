import { NextRequest, NextResponse } from 'next/server';
import api from '@/libs/api/axios';

export async function POST(request: NextRequest) {
  try {
    // Extract access token from cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const accessTokenMatch = cookieHeader.match(/access_token=([^;]+)/);
    const accessToken = accessTokenMatch ? accessTokenMatch[1] : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    console.log('Frontend API: Accessing file via shareable link token');

    // Call backend access-via-link endpoint
    const response = await api.post('/file/access-via-link', { token }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
    });

    console.log('Frontend API: Access via link successful:', response.data);
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Frontend API: Error accessing file via shareable link:', error);
    
    // Handle axios error response
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to access file via shareable link';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
} 