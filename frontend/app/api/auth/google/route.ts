import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const backendUrl = process.env.NEXT_APP_BACKEND_URL || 'http://localhost:5000';
  return NextResponse.redirect(`${backendUrl}/auth/google`);
} 