import { NextResponse } from 'next/server';
import api from '@/app/libs/api/axios';

// Register a new user
export async function POST(request) {
  try {
    const body = await request.json();
    const response = await api.post('/auth/register', body);
    return NextResponse.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Registration failed';
    return NextResponse.json({ message }, { status });
  }
}

// Handle login
export async function PUT(request) {
  try {
    const body = await request.json();
    const response = await api.post('/auth/login', body);
    
    // Extract the cookies from the backend response
    const cookies = response.headers['set-cookie'];
    
    // Create a response with the data from the backend
    const nextResponse = NextResponse.json(response.data);
    
    // Forward the cookies if they exist
    if (cookies) {
      cookies.forEach(cookie => {
        const [cookieName, ...rest] = cookie.split('=');
        const cookieValue = rest.join('=').split(';')[0];
        nextResponse.cookies.set(cookieName, cookieValue);
      });
    }
    
    return nextResponse;
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Login failed';
    return NextResponse.json({ message }, { status });
  }
}

// Handle logout
export async function DELETE(request) {
  try {
    const response = await api.post('/auth/logout');
    
    const nextResponse = NextResponse.json({ message: 'Logout successful' });
    
    // Clear the access token cookie
    nextResponse.cookies.delete('access_token');
    
    return nextResponse;
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Logout failed';
    return NextResponse.json({ message }, { status });
  }
}

// Get current user info
export async function GET(request) {
  try {
    const response = await api.get('/auth/me');
    return NextResponse.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Failed to get user info';
    return NextResponse.json({ message }, { status });
  }
}
