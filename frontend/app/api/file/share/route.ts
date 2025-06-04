import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    console.log('Share route: Delegating to access-via-link API');

    // Forward the request to the dedicated access-via-link endpoint
    const accessResponse = await fetch(`${request.nextUrl.origin}/api/file/access-via-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({ token })
    });

    const accessData = await accessResponse.json();

    if (!accessResponse.ok) {
      return NextResponse.json(accessData, { status: accessResponse.status });
    }

    console.log('Share route: Access via link successful:', accessData);
    return NextResponse.json(accessData);
  } catch (error: any) {
    console.error('Share route: Error accessing file via shareable link:', error);
    
    return NextResponse.json(
      { error: 'Failed to access file via shareable link' },
      { status: 500 }
    );
  }
} 