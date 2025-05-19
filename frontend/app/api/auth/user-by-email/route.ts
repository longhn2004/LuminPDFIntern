import { NextRequest, NextResponse } from 'next/server';

/**
 * GET endpoint to find a user by email
 * @param request - The incoming request with email query parameter
 * @returns User information or error
 */
export async function GET(request: NextRequest) {
  try {
    // Get email from query parameters
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Forward request to backend API
    const response = await fetch(`${process.env.NEXT_APP_API_URL}/api/auth/user-by-email?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { message: errorData?.message || 'User not found' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error searching for user:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 