import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import api from '@/libs/api/axios';
import { AxiosError } from 'axios';
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json(
        { message: 'File ID is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
    
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
    
    // Get user role from backend
    const response = await api.get(`/file/${id}/user-role`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return NextResponse.json(response.data);
    
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error getting user role:', error.message);
    } else {
      console.error('Error getting user role:', String(error));
    }
    
    if (error instanceof AxiosError && error.response) {
      return NextResponse.json(
        { message: error.response.data.message || 'Failed to get user role' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 