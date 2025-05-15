import { NextResponse } from 'next/server';
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_APP_BACKEND_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    
    const response = await api.get('/auth/me', {
      headers: {
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
    });
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Get current user API error:', error.response?.data || error.message);
    
    if (error.response) {
      return NextResponse.json(
        { message: error.response.data.message || 'Failed to get user data' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 