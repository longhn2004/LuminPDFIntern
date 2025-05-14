import { NextResponse } from 'next/server';
import api from '@/app/libs/api/axios';

// Verify email with token
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { message: 'Verification token is required' }, 
        { status: 400 }
      );
    }
    
    // Call the backend API to verify the email token
    const response = await api.get(`/auth/verify-email?token=${token}`);
    
    // Redirect to success page after verification
    return NextResponse.redirect(new URL('/auth/verify-success', request.url));
  } catch (error) {
    console.error('Email verification error:', error.response?.data || error.message);
    
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Email verification failed';
    
    // Redirect to an error page on failure
    return NextResponse.redirect(
      new URL(`/auth/verify-error?message=${encodeURIComponent(message)}`, request.url)
    );
  }
} 