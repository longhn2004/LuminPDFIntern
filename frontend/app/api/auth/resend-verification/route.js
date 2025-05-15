import { NextResponse } from 'next/server';
import api from '@/app/libs/api/axios';

export async function POST(request) {
  try {
    const body = await request.json();
    
    if (!body.email) {
      return NextResponse.json(
        { message: 'Email is required' }, 
        { status: 400 }
      );
    }
    
    const response = await api.post('/auth/resend-verification', body);
    return NextResponse.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to resend verification email';
    return NextResponse.json({ message }, { status });
  }
} 