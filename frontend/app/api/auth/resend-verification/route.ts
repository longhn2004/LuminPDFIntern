import { NextRequest, NextResponse } from 'next/server';
import api from '@/libs/api/axios';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import { AxiosError } from 'axios';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.email) {
      return NextResponse.json(
        { message: 'Email is required' }, 
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
    
    const response = await api.post('/auth/resend-verification', body);
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Resend verification API error:', error.message);
    } else {
      console.error('Resend verification API error:', String(error));
    }
    
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const message = error.response.data?.message || 'Failed to resend verification email';
      return NextResponse.json({ message }, { status });
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 