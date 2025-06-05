import { NextRequest, NextResponse } from 'next/server';
import api from '@/libs/api/axios';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import { AxiosError } from 'axios';
export async function POST(request: NextRequest) {
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

    const { fileId, role } = await request.json();
    
    if (!fileId || !role) {
      return NextResponse.json(
        { error: 'File ID and role are required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Use axios instance with manually set authorization header
    const response = await api.post('/file/shareable-link/create', { fileId, role }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
    });

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error creating shareable link:', error.message);
    } else {
      console.error('Error creating shareable link:', String(error));
    }
    
    // Handle axios error response
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const message = error.response.data?.message || 'Failed to create shareable link';
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