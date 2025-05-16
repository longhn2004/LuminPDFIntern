import { NextResponse } from 'next/server';
import api from '@/libs/api/axios';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { message: 'Verification token is required' }, 
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
    
    const response = await api.get(`/auth/verify-email?token=${token}`);
    
    return NextResponse.redirect(new URL('/auth/verify-success', request.url));
  } catch (error) {
    console.error('Email verification error:', error.response?.data || error.message);
    
    const status = error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = error.response?.data?.message || 'Email verification failed';
    
    return NextResponse.redirect(
      new URL(`/auth/verify-error?message=${encodeURIComponent(message)}`, request.url)
    );
  }
} 