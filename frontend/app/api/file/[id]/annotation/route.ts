import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import api from '@/libs/api/axios';

/**
 * POST endpoint to create an annotation for a file
 * @param request - The incoming request containing annotation data
 * @param params - Route parameters containing the file ID
 * @returns The created annotation
 */
export async function POST(
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
    
    const data = await request.json();
    
    // Use api client to call backend with token
    const response = await api.post(`/file/${id}/annotation`, data, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error creating annotation:', error.response?.data || error.message);
    
    if (error.response) {
      return NextResponse.json(
        { message: error.response.data.message || 'Failed to create annotation' },
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
 * GET endpoint to retrieve annotations for a file
 * @param request - The incoming request
 * @param params - Route parameters containing the file ID
 * @returns List of annotations for the file
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
    const response = await api.get(`/file/annotations`, {
      params: { fileId: id },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching annotations:', error.response?.data || error.message);
    
    if (error.response) {
      return NextResponse.json(
        { message: error.response.data.message || 'Failed to fetch annotations' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 