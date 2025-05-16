import { NextResponse } from 'next/server';
import api from '@/libs/api/axios';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
export async function POST(request: Request) {
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
  } catch (error: any) {
    const status = error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = error.response?.data?.message || 'Failed to resend verification email';
    return NextResponse.json({ message }, { status });
  }
} 