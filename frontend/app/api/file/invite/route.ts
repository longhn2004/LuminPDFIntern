import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import { AxiosError } from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import api from '@/libs/api/axios';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    

    const cookieHeader = request.headers.get('cookie') || '';
    const accessTokenMatch = cookieHeader.match(/access_token=([^;]+)/);
    const accessToken = accessTokenMatch ? accessTokenMatch[1] : null;

    if (!accessToken) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: HTTP_STATUS.UNAUTHORIZED }
        );
    }
    // Validate required fields
    if (!data.fileId || !data.emails || !data.role) {
      return NextResponse.json(
        { message: 'Missing required fields: fileId, email, or role' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
    
    // Use api client to call backend
    const response = await api.post('/file/invite', data, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error inviting user:', error.message);
    } else {
      console.error('Error inviting user:', String(error));
    }
    
    if (error instanceof AxiosError && error.response) {
      return NextResponse.json(
        { message: error.response.data.message || 'Failed to invite user' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 