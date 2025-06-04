import { NextRequest, NextResponse } from 'next/server';
import api from '@/libs/api/axios';

export async function PUT(request: NextRequest) {
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

    const { fileId, enabled } = await request.json();
    
    if (!fileId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'File ID and enabled status are required' },
        { status: 400 }
      );
    }

    // Use axios instance with manually set authorization header
    const response = await api.put('/file/shareable-link/toggle', { fileId, enabled }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error toggling shareable link feature:', error);
    
    // Handle axios error response
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to toggle shareable link feature';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
} 