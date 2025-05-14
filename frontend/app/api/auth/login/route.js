import { NextResponse } from 'next/server';
import axios from 'axios';

// Configuration for axios to include credentials
const api = axios.create({
  baseURL: process.env.NEXT_APP_BACKEND_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Handle login requests
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Call the backend login endpoint
    const response = await api.post('/auth/login', body);
    
    // Create a response object
    const nextResponse = NextResponse.json(response.data);
    
    // Forward cookies from the backend response
    if (response.headers['set-cookie']) {
      const cookies = response.headers['set-cookie'];
      
      cookies.forEach(cookie => {
        // Extract cookie name and value
        const [cookieName, ...rest] = cookie.split('=');
        const cookieValue = rest.join('=').split(';')[0];
        
        // Set the cookie in the response
        nextResponse.cookies.set({
          name: cookieName,
          value: cookieValue,
          httpOnly: cookie.includes('HttpOnly'),
          secure: cookie.includes('Secure'),
          sameSite: cookie.includes('SameSite=Lax') ? 'lax' : 'strict',
          path: '/',
        });
      });
    }
    
    return nextResponse;
  } catch (error) {
    console.error('Login API error:', error.response?.data || error.message);
    
    // Return the error from the backend
    if (error.response) {
      return NextResponse.json(
        { message: error.response.data.message || 'Login failed' },
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