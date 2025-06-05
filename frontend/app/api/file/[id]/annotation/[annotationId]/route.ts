import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import api from '@/libs/api/axios';
import { AxiosError } from 'axios';
/**
 * PUT endpoint to update an annotation
 * @param request - The incoming request containing updated annotation data
 * @param params - Route parameters containing the file ID and annotation ID
 * @returns The updated annotation
 */
export async function PUT(
  request: NextRequest,
  context: { params: { id: string; annotationId: string } }
) {
  try {
    // Properly await the params object
    const { id, annotationId } = await context.params;
    
    if (!id || !annotationId) {
      return NextResponse.json(
        { message: 'File ID and annotation ID are required' },
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
    
    const data = await request.json();
    
    // Use api client to call backend with token
    const response = await api.put(`/file/${id}/annotation/${annotationId}`, data, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error updating annotation:', error.message);
    } else {
      console.error('Error updating annotation:', String(error));
    }
    
    if (error instanceof AxiosError && error.response) {
      return NextResponse.json(
        { message: error.response.data.message || 'Failed to update annotation' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * DELETE endpoint to remove an annotation
 * @param request - The incoming request
 * @param params - Route parameters containing the file ID and annotation ID
 * @returns Success message
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string; annotationId: string } }
) {
  try {
    // Properly await the params object
    const { id, annotationId } = await context.params;
    
    if (!id || !annotationId) {
      return NextResponse.json(
        { message: 'File ID and annotation ID are required' },
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
    const response = await api.delete(`/file/${id}/annotation/${annotationId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error deleting annotation:', error.message);
    } else {
      console.error('Error deleting annotation:', String(error));
    }
    
    if (error instanceof AxiosError && error.response) {
      return NextResponse.json(
        { message: error.response.data.message || 'Failed to delete annotation' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 