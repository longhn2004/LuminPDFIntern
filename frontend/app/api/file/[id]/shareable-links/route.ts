import { NextRequest, NextResponse } from 'next/server';
import api from '@/libs/api/axios';

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
        { status: 401 }
      );
    }

    // Await params before accessing properties (NextJS 15 requirement)
    const { id: fileId } = await params;
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Use axios instance with manually set authorization header
    const response = await api.get(`/file/${fileId}/shareable-links`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error getting shareable links:', error);
    
    // Handle axios error response
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to get shareable links';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
} 