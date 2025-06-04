import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import api from '@/libs/api/axios';


export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json(
        { message: 'File ID is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
    
    // Extract shareable link token from query parameters
    const url = new URL(request.url);
    const shareToken = url.searchParams.get('token');
    
    const cookieHeader = request.headers.get('cookie') || '';
    const accessTokenMatch = cookieHeader.match(/access_token=([^;]+)/);
    const accessToken = accessTokenMatch ? accessTokenMatch[1] : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }
    
    // Build the backend URL with token parameter if provided
    let backendUrl = `/file/${id}/download`;
    if (shareToken) {
      backendUrl += `?token=${shareToken}`;
    }
    
    console.log(`Frontend download API: Requesting ${backendUrl}${shareToken ? ' with shareable link token' : ''}`);
    
    const response = await api.get(backendUrl, { 
      responseType: 'arraybuffer',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const contentType = response.headers['content-type'] || 'application/pdf';
    const contentDisposition = response.headers['content-disposition'] || '';
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    const filename = filenameMatch ? filenameMatch[1] : `file-${id}.pdf`;
    
    return new NextResponse(response.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'X-Shareable-Access': shareToken ? 'true' : 'false',
      },
    });
  } catch (error: any) {
    console.error('Error downloading file:', error.response?.data || error.message);
    
    if (error.response) {
      return NextResponse.json(
        { message: error.response.data?.message || 'Failed to download file' },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 