import { NextResponse } from 'next/server';

// Redirect to Google OAuth endpoint on backend
export async function GET(request) {
  const backendUrl = process.env.NEXT_APP_BACKEND_URL || 'http://localhost:5000';
  return NextResponse.redirect(`${backendUrl}/auth/google`);
} 