import { NextResponse, NextRequest } from 'next/server';
import api from '@/libs/api/axios';

export async function GET(request: NextRequest) {
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

    // Use axios with manually set authorization header
    const response = await api.get('/file/total-files', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    // Handle the backend format { totalFiles: count }
    return NextResponse.json({ total: response.data.totalFiles });
  } catch (error: any) {
    console.error('Error fetching total files:', error);
    
    // Handle axios error response
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to fetch total files count';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
} 