import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import api from '@/libs/api/axios';
import { AxiosError } from 'axios';
/**
 * GET endpoint to retrieve users who have access to a file
 * @param request - The incoming request
 * @param params - Route parameters containing the file ID
 * @returns List of users with access to the file
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Properly await the params object
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
    
    // Use api client to call backend with token
    const response = await api.get(`/file/${id}/users`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error fetching file users:', error.message);
    } else {
      console.error('Error fetching file users:', String(error));
    }
    
    if (error instanceof AxiosError && error.response) {
      return NextResponse.json(
        { message: error.response.data.message || 'Failed to fetch file users' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 