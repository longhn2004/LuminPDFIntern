import { NextRequest, NextResponse } from 'next/server';
import api from '@/libs/api/axios';

export async function POST(request: NextRequest) {
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

    const { fileId, role } = await request.json();
    
    if (!fileId || !role) {
      return NextResponse.json(
        { error: 'File ID and role are required' },
        { status: 400 }
      );
    }

    // Use axios instance with manually set authorization header
    const response = await api.post('/file/shareable-link/create', { fileId, role }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error creating shareable link:', error);
    
    // Handle axios error response
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to create shareable link';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
} 