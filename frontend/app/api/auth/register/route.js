import { NextResponse } from 'next/server';
import axios from 'axios';

// Configuration for axios
const api = axios.create({
  baseURL: process.env.NEXT_APP_BACKEND_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Handle user registration
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Call the backend API to register the user
    const response = await api.post('/auth/register', body);
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Registration API error:', error.response?.data || error.message);
    
    // Return the error from the backend
    if (error.response) {
      return NextResponse.json(
        { message: error.response.data.message || 'Registration failed' },
        { status: error.response.status }
      );
    }
    
    // Generic error
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 