import { NextRequest, NextResponse } from 'next/server';
import api from '@/libs/api/axios';

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
        { status: 401 }
      );
    }

    
    
    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 }
      );
    }

    // Use axios instance with manually set authorization header
    const response = await api.delete(`/file/shareable-link/${linkId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error deleting shareable link:', error);
    
    // Handle axios error response
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to delete shareable link';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
} 