import { NextRequest, NextResponse } from 'next/server';
import api from '@/libs/api/axios';
import { AxiosError } from 'axios';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    // Extract access token from cookies
    const linkId = await params.linkId;

    const cookieHeader = request.headers.get('cookie') || '';
    const accessTokenMatch = cookieHeader.match(/access_token=([^;]+)/);
    const accessToken = accessTokenMatch ? accessTokenMatch[1] : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    
    
    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Use axios instance with manually set authorization header
    const response = await api.delete(`/file/shareable-link/${linkId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
    });

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error deleting shareable link:', error.message);
    } else {
      console.error('Error deleting shareable link:', String(error));
    }
    
    // Handle axios error response
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const message = error.response.data?.message || 'Failed to delete shareable link';
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