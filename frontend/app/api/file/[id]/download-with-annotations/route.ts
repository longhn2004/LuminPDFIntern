import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import api from '@/libs/api/axios';
import { AxiosError } from 'axios';
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json(
        { message: 'File ID is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
    
    // Extract shareable link token from query parameters
    const url = new URL(request.url);
    const shareToken = url.searchParams.get('token');
    
    const cookieHeader = request.headers.get('cookie') || '';
    const accessTokenMatch = cookieHeader.match(/access_token=([^;]+)/);
    const accessToken = accessTokenMatch ? accessTokenMatch[1] : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }
    
    // Build the backend URL with token parameter if provided
    let backendUrl = `/file/${id}/download-with-annotations`;
    if (shareToken) {
      backendUrl += `?token=${shareToken}`;
    }
    
    console.log(`Frontend download-with-annotations API: Requesting ${backendUrl}${shareToken ? ' with shareable link token' : ''}`);
    
    const response = await api.get(backendUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error getting download data with annotations:', error.message);
    } else {
      console.error('Error getting download data with annotations:', String(error));
    }
    
    if (error instanceof AxiosError && error.response) {
      return NextResponse.json(
        { message: error.response.data?.message || 'Failed to get download data with annotations' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 