import { NextRequest, NextResponse } from 'next/server';
import api from '@/libs/api/axios';
import { AxiosError } from 'axios';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Await params before accessing properties (NextJS 15 requirement)
    const { id: fileId } = await params;
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Use axios instance with manually set authorization header
    const response = await api.get(`/file/${fileId}/shareable-links`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
    });

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error getting shareable links:', error.message);
    } else {
      console.error('Error getting shareable links:', String(error));
    }
    
    // Handle axios error response
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const message = error.response.data?.message || 'Failed to get shareable links';
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