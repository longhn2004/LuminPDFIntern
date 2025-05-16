import { NextResponse } from 'next/server';
import axios from 'axios';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import api from '@/libs/api/axios';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const response = await api.post('/auth/register', body);
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Registration API error:', error.response?.data || error.message);
    
    if (error.response) {
      return NextResponse.json(
        { message: error.response.data.message || 'Registration failed' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 