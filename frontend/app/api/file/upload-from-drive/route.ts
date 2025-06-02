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

    // Get JSON data with fileId
    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: 'Google Drive file ID is required' },
        { status: 400 }
      );
    }

    // Validate file ID format
    if (!/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
      return NextResponse.json(
        { error: 'Invalid Google Drive file ID format' },
        { status: 400 }
      );
    }

    // Send request to backend API
    const response = await api.post('/file/upload-from-drive', { fileId }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error uploading from Google Drive:', error);
    
    // Handle axios error response
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to upload from Google Drive';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
} 