import { NextRequest, NextResponse } from 'next/server';
import api from '@/libs/api/axios';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '0';
    const sort = searchParams.get('sort') || 'DESC';

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

    // Use axios with manually set authorization header
    const response = await api.get(`/file/list`, {
      params: { page, sort },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // Axios directly returns the parsed JSON data
    const filesArray = response.data;
    
    // Return the files wrapped in the structure expected by the frontend
    return NextResponse.json({ files: filesArray });
  } catch (error: any) {
    console.error('Error fetching files:', error);
    
    // Handle axios error response
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to fetch files list';
    
    return NextResponse.json(
      { error: message }, 
      { status }
    );
  }
} 