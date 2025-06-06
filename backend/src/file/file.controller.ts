import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Req,
  Get,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  Put,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { FileService } from './file.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { InviteUserDto } from './dto/invite-user.dto';
import { ListFilesDto } from './dto/list-files.dto';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { UploadFromDriveDto } from './dto/upload-from-drive.dto';
import { CreateShareableLinkDto } from './dto/create-shareable-link.dto';
import { ToggleShareableLinkDto } from './dto/toggle-shareable-link.dto';
import { AccessViaLinkDto } from './dto/access-via-link.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { BadRequestException } from '@nestjs/common';
import { ChangeRoleDto } from './dto/change-role.dto';
import { ChangeRolesDto } from './dto/change-roles.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('file')
@Controller('api/file')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
@ApiCookieAuth('access_token')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  private validateObjectId(id: string): void {
    try {
      new ObjectId(id);
    } catch (error) {
      throw new NotFoundException('File not found');
    }
  }

  @ApiOperation({
    summary: 'Upload a PDF file',
    description: 'Uploads a PDF file to the system for the authenticated user',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'PDF file upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file to upload (max 20MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        name: 'document.pdf',
        path: 'pdfs/123456789-uuid.pdf',
        owner: '507f1f77bcf86cd799439012',
        ownerEmail: 'user@example.com',
        viewers: [],
        editors: [],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or file size exceeds limit',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user: any },
  ) {
    return this.fileService.uploadFile(file, req.user);
  }

  @ApiOperation({
    summary: 'Upload PDF from Google Drive',
    description: 'Uploads a PDF file from Google Drive using the file ID',
  })
  @ApiBody({ type: UploadFromDriveDto })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully from Google Drive',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        name: 'drive-document.pdf',
        path: 'pdfs/123456789-uuid.pdf',
        owner: '507f1f77bcf86cd799439012',
        ownerEmail: 'user@example.com',
        viewers: [],
        editors: [],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid Google Drive file ID or file not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @Post('upload-from-drive')
  async uploadFromDrive(
    @Body() uploadFromDriveDto: UploadFromDriveDto,
    @Req() req: Request & { user: any },
  ) {
    if (!uploadFromDriveDto.fileId) {
      throw new BadRequestException('Google Drive file ID is required');
    }
    return this.fileService.uploadFromDrive(uploadFromDriveDto.fileId, req.user);
  }

  @ApiOperation({
    summary: 'Get total files count',
    description: 'Returns the total number of files accessible to the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Total files count retrieved successfully',
    schema: {
      example: {
        totalFiles: 42,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @Get('total-files')
  async totalFiles(@Req() req: Request & { user: any }) {
    return { totalFiles: await this.fileService.totalFiles(req.user) };
  }

  @ApiOperation({
    summary: 'Get file annotations',
    description: 'Returns annotations for a file (XFDF format)',
  })
  @ApiParam({
    name: 'id',
    description: 'File MongoDB ObjectId',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'token',
    description: 'Optional shareable link token for access',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Annotations retrieved successfully',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        file: '507f1f77bcf86cd799439011',
        xfdf: '<?xml version="1.0" encoding="UTF-8"?><xfdf>...</xfdf>',
        version: 1,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No access to this file or annotations',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @Get(':id/annotation')
  async getAnnotations(
    @Param('id') fileId: string,
    @Query('token') token: string,
    @Req() req: Request & { user: any },
  ) {
    this.validateObjectId(fileId);
    return this.fileService.getAnnotations(fileId, req.user, token);
  }

  @ApiOperation({
    summary: 'List user files',
    description: 'Returns a paginated list of files accessible to the authenticated user',
  })
  @ApiQuery({ type: ListFilesDto })
  @ApiResponse({
    status: 200,
    description: 'List of files retrieved successfully',
    schema: {
      example: [
        {
          id: '507f1f77bcf86cd799439011',
          name: 'document.pdf',
          owner: 'John Doe',
          role: 'owner',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        {
          id: '507f1f77bcf86cd799439012',
          name: 'shared-doc.pdf',
          owner: 'Jane Smith',
          role: 'editor',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @Get('list')
  async listFiles(
    @Query() query: ListFilesDto,
    @Req() req: Request & { user: any },
  ) {
    return this.fileService.listFiles(query, req.user);
  }

  @ApiOperation({
    summary: 'Download file',
    description: 'Downloads a PDF file (redirects to signed S3 URL)',
  })
  @ApiParam({
    name: 'id',
    description: 'File MongoDB ObjectId',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'token',
    description: 'Optional shareable link token for access',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to file download URL',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No access to this file',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @Get(':id/download')
  async downloadFile(
    @Param('id') id: string,
    @Query('token') token: string,
    @Req() req: Request & { user: any },
    @Res() res: Response,
  ) {
    this.validateObjectId(id);
    return this.fileService.downloadFile(id, req.user, res, token);
  }

  @Get(':id/download-with-annotations')
  async downloadFileWithAnnotations(
    @Param('id') id: string,
    @Query('token') token: string,
    @Req() req: Request & { user: any },
  ) {
    this.validateObjectId(id);
    return this.fileService.downloadFileWithAnnotations(id, req.user, token);
  }

  @Get(':id/users')
  async getFileUsers(
    @Param('id') id: string,
    @Req() req: Request & { user: any },
  ) {
    this.validateObjectId(id);
    return this.fileService.getFileUsers(id, req.user);
  }

  @Get(':id/user-role')
  async getFileUserRole(
    @Param('id') id: string,
    @Req() req: Request & { user: any },
  ) {
    this.validateObjectId(id);
    return this.fileService.getFileUserRole(id, req.user);
  }

  @ApiOperation({
    summary: 'Invite users to file',
    description: 'Invites users by email to access a file with specified role',
  })
  @ApiBody({ type: InviteUserDto })
  @ApiResponse({
    status: 200,
    description: 'Invitations sent successfully',
    schema: {
      example: {
        message: 'Invitations sent successfully',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only file owner can invite users',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @Post('invite')
  async inviteUser(
    @Body() inviteDto: InviteUserDto,
    @Req() req: Request & { user: any },
  ) {
    return this.fileService.inviteUser(inviteDto, req.user);
  }

  @ApiOperation({
    summary: 'Change user role for file',
    description: 'Changes the role of a user for a specific file (owner only)',
  })
  @ApiBody({ type: ChangeRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Role changed successfully',
    schema: {
      example: {
        message: 'Role changed successfully',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only file owner can change roles',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @Post('change-role')
  async changeRole(
    @Body() changeRoleDto: ChangeRoleDto,
    @Req() req: Request & { user: any },
  ) {
    return this.fileService.changeRole(changeRoleDto, req.user);
  }

  @Post('change-roles')
  async changeRoles(
    @Body() changeRolesDto: ChangeRolesDto,
    @Req() req: Request & { user: any },
  ) {
    return this.fileService.changeRoles(changeRolesDto, req.user);
  }

  @ApiOperation({
    summary: 'Save file annotations',
    description: 'Saves annotations for a file (XFDF format)',
  })
  @ApiParam({
    name: 'id',
    description: 'File MongoDB ObjectId',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: CreateAnnotationDto })
  @ApiQuery({
    name: 'token',
    description: 'Optional shareable link token for access',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Annotations saved successfully',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        file: '507f1f77bcf86cd799439011',
        xfdf: '<?xml version="1.0" encoding="UTF-8"?><xfdf>...</xfdf>',
        version: 2,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T01:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No edit access to this file',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @Post(':id/annotation/save')
  async saveAnnotation(
    @Param('id') fileId: string,
    @Body() annotationDto: CreateAnnotationDto,
    @Query('token') token: string,
    @Req() req: Request & { user: any },
  ) {
    this.validateObjectId(fileId);
    return this.fileService.saveAnnotation(fileId, annotationDto, req.user, token);
  }

  @ApiOperation({
    summary: 'Delete file',
    description: 'Deletes a file (owner only)',
  })
  @ApiParam({
    name: 'id',
    description: 'File MongoDB ObjectId',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    schema: {
      example: {
        message: 'File deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only file owner can delete',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @Delete(':id')
  async deleteFile(
    @Param('id') id: string,
    @Req() req: Request & { user: any },
  ) {
    this.validateObjectId(id);
    return this.fileService.deleteFile(id, req.user);
  }

  @ApiOperation({
    summary: 'Get file information',
    description: 'Returns detailed information about a file',
  })
  @ApiParam({
    name: 'id',
    description: 'File MongoDB ObjectId',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'File information retrieved successfully',
    schema: {
      example: {
        id: '507f1f77bcf86cd799439011',
        name: 'document.pdf',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        owner: {
          email: 'owner@example.com',
          name: 'John Doe',
        },
        viewers: ['viewer@example.com'],
        editors: ['editor@example.com'],
        shareableLinkEnabled: true,
        shareableLinks: [],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @Get(':id/info')
  async getFileInfo(@Param('id') id: string) {
    this.validateObjectId(id);
    return this.fileService.getFileInfo(id);
  }

  // =============================================
  // SHAREABLE LINK ENDPOINTS
  // =============================================

  @ApiOperation({
    summary: 'Create shareable link',
    description: 'Creates a shareable link for a file (owner only)',
  })
  @ApiBody({ type: CreateShareableLinkDto })
  @ApiResponse({
    status: 201,
    description: 'Shareable link created successfully',
    schema: {
      example: {
        id: '507f1f77bcf86cd799439013',
        token: '123e4567-e89b-12d3-a456-426614174000',
        role: 'viewer',
        enabled: true,
        url: 'http://localhost:3000/share?token=123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2023-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only file owner can create shareable links',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @Post('shareable-link/create')
  async createShareableLink(
    @Body() createShareableLinkDto: CreateShareableLinkDto,
    @Req() req: Request & { user: any },
  ) {
    this.validateObjectId(createShareableLinkDto.fileId);
    return this.fileService.createShareableLink(createShareableLinkDto, req.user);
  }

  @Get(':id/shareable-links')
  async getShareableLinks(
    @Param('id') fileId: string,
    @Req() req: Request & { user: any },
  ) {
    this.validateObjectId(fileId);
    return this.fileService.getShareableLinks(fileId, req.user);
  }

  @Delete('shareable-link/:linkId')
  async deleteShareableLink(
    @Param('linkId') linkId: string,
    @Req() req: Request & { user: any },
  ) {
    this.validateObjectId(linkId);
    return this.fileService.deleteShareableLink(linkId, req.user);
  }

  @Put('shareable-link/toggle')
  async toggleShareableLinkFeature(
    @Body() toggleShareableLinkDto: ToggleShareableLinkDto,
    @Req() req: Request & { user: any },
  ) {
    this.validateObjectId(toggleShareableLinkDto.fileId);
    return this.fileService.toggleShareableLinkFeature(toggleShareableLinkDto, req.user);
  }

  @ApiOperation({
    summary: 'Access file via shareable link',
    description: 'Grants access to a file using a shareable link token',
  })
  @ApiBody({ type: AccessViaLinkDto })
  @ApiResponse({
    status: 200,
    description: 'Access granted via shareable link',
    schema: {
      example: {
        fileId: '507f1f77bcf86cd799439011',
        fileName: 'document.pdf',
        accessGranted: true,
        role: 'viewer',
        temporary: true,
        message: 'Temporary viewer access granted via shareable link',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid or expired shareable link',
  })
  @ApiResponse({
    status: 403,
    description: 'Shareable links are disabled for this file',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @Post('access-via-link')
  async accessViaLink(
    @Body() accessViaLinkDto: AccessViaLinkDto,
    @Req() req: Request & { user: any },
  ) {
    return this.fileService.accessViaLink(accessViaLinkDto.token, req.user);
  }

  @Get('cache/test/:id')
  async testCache(@Param('id') id: string) {
    this.validateObjectId(id);
    console.log(`🧪 Testing cache functionality for file: ${id}`);
    
    // Test cache operations
    const startTime = Date.now();
    
    // First call - should be cache miss
    console.log('🔍 First call (expected cache miss):');
    const result1 = await this.fileService.getFileInfo(id);
    const firstCallTime = Date.now() - startTime;
    
    // Second call - should be cache hit
    console.log('🔍 Second call (expected cache hit):');
    const secondCallStart = Date.now();
    const result2 = await this.fileService.getFileInfo(id);
    const secondCallTime = Date.now() - secondCallStart;
    
    return {
      message: 'Cache test completed',
      results: {
        firstCall: {
          time: `${firstCallTime}ms`,
          data: result1
        },
        secondCall: {
          time: `${secondCallTime}ms`,
          data: result2
        },
        performanceImprovement: firstCallTime > 0 ? `${((firstCallTime - secondCallTime) / firstCallTime * 100).toFixed(2)}%` : 'N/A'
      }
    };
  }

  @Get('google/test-credentials')
  async testGoogleCredentials() {
    console.log('🧪 Testing Google credentials endpoint called');
    return this.fileService.testGoogleCredentials();
  }
}
