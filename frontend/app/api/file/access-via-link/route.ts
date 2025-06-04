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

    // Handle empty body gracefully
    let requestBody;
    try {
      const body = await request.text();
      requestBody = body ? JSON.parse(body) : {};
    } catch (parseError) {
      console.error('Frontend API: Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { token } = requestBody;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    console.log('Frontend API: Accessing file via shareable link token');

    // Call backend access-via-link endpoint
    const response = await api.post('/file/access-via-link', { token }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
    });

    console.log('Frontend API: Access via link successful:', response.data);
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Frontend API: Error accessing file via shareable link:', error);
    
    // Handle axios error response
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to access file via shareable link';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const action = searchParams.get('action');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    if (action === 'download') {
      console.log('Frontend API: Download via shareable link token');
      
      // For downloads, proxy the request to backend
      const response = await api.get(`/file/access-via-link`, {
        params: { token, action: 'download' },
        responseType: 'stream'
      });

      // Stream the file back to client
      const headers = new Headers();
      if (response.headers['content-type']) {
        headers.set('Content-Type', response.headers['content-type']);
      }
      if (response.headers['content-disposition']) {
        headers.set('Content-Disposition', response.headers['content-disposition']);
      }

      return new NextResponse(response.data, { headers });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Frontend API: Error in GET access-via-link:', error);
    
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to process request';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
} 