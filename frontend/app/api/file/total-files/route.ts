import { NextResponse, NextRequest } from 'next/server';
import api from '@/libs/api/axios';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import { AxiosError } from 'axios';
export async function GET(request: NextRequest) {
  try {
    // Extract access token from cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const accessTokenMatch = cookieHeader.match(/access_token=([^;]+)/);
    const accessToken = accessTokenMatch ? accessTokenMatch[1] : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: HTTP_STATUS.UNAUTHORIZED }
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error fetching total files:', error.message);
    } else {
      console.error('Error fetching total files:', String(error));
    }
    
    // Handle axios error response
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const message = error.response.data?.message || 'Failed to fetch total files count';
      return NextResponse.json(
        { error: message },
        { status }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 