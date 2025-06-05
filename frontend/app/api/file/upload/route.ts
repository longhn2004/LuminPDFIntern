import { NextRequest, NextResponse } from 'next/server';
import api from '@/libs/api/axios';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import { AxiosError } from 'axios';
export async function POST(request: NextRequest) {
  try {
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

    // Get form data with file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 20MB limit' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Create a new FormData to send to the backend
    const backendFormData = new FormData();
    backendFormData.append('file', file);
    
    // Use axios instance with manually set authorization header
    const response = await api.post('/file/upload', backendFormData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${accessToken}`
      },
    });

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error uploading file:', error.message);
    } else {
      console.error('Error uploading file:', String(error));
    }
    
    // Handle axios error response
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const message = error.response.data?.message || 'Failed to upload file';
      return NextResponse.json(
        { error: message },
        { status }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// Set a higher body size limit for file uploads
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
}; 