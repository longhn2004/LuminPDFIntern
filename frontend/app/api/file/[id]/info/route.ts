import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';
import api from '@/libs/api/axios';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        if (!id) {
            return NextResponse.json(
              { message: 'File ID is required' },
              { status: HTTP_STATUS.BAD_REQUEST }
            );
          }
          
        const cookieHeader = request.headers.get('cookie') || '';
        const accessTokenMatch = cookieHeader.match(/access_token=([^;]+)/);
        const accessToken = accessTokenMatch ? accessTokenMatch[1] : null;
    
        if (!accessToken) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: HTTP_STATUS.UNAUTHORIZED }
            );
        }

        const response = await api.get(`/file/${id}/info`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return NextResponse.json(response.data);
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error getting file info:', error.message);
        } else {
            console.error('Error getting file info:', String(error));
        }
        return NextResponse.json(
            { message: 'Failed to get file info' },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
    }
}
    