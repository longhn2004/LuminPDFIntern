import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import api from '@/libs/api/axios';
import { AxiosError } from 'axios';
/**
 * POST endpoint to change a user's role for a file
 * @param request - The incoming request containing file ID, user ID, and new role
 * @returns Success message or error
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields

    const cookieHeader = request.headers.get('cookie') || '';
    const accessTokenMatch = cookieHeader.match(/access_token=([^;]+)/);
    const accessToken = accessTokenMatch ? accessTokenMatch[1] : null;

    if (!accessToken) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: HTTP_STATUS.UNAUTHORIZED }
        );
    }


    if (!data.fileId || !data.email || !data.role) {      
      return NextResponse.json(        
        { message: 'Missing required fields: fileId, email, or role' },        
        { status: HTTP_STATUS.BAD_REQUEST }      
      );    
    }
    
    // Use api client to call backend
    const response = await api.post('/file/change-role', data, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error changing user role:', error.message);
    } else {
      console.error('Error changing user role:', String(error));
    }
    
    if (error instanceof AxiosError && error.response) {
      return NextResponse.json(
        { message: error.response.data.message || 'Failed to change user role' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 