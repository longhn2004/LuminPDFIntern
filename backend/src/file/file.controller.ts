import { Controller, Post, UseInterceptors, UploadedFile, Req, Get, Param, Query, Body, Res, UseGuards, Put, Delete, NotFoundException } from '@nestjs/common';
import { FileService } from './file.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { InviteUserDto } from './dto/invite-user.dto';
import { ListFilesDto } from './dto/list-files.dto';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { BadRequestException } from '@nestjs/common';
import { ChangeRoleDto } from './dto/change-role.dto';

@Controller('api/file')
@UseGuards(AuthGuard('jwt'))
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request & { user: any }) {
    return this.fileService.uploadFile(file, req.user);
  }

  @Post('upload-from-drive')
  async uploadFromDrive(@Body('fileId') fileId: string, @Req() req: Request & { user: any }) {
    return this.fileService.uploadFromDrive(fileId, req.user);
  }

  @Get('total-files')
  async totalFiles(@Req() req: Request & { user: any }) {
    return { totalFiles: await this.fileService.totalFiles(req.user) };
  }

  @Get(':id/annotation')
  async getAnnotations(@Param('id') fileId: string, @Req() req: Request & { user: any }) {
    return this.fileService.getAnnotations(fileId, req.user);
  }

  @Get('list')
  async listFiles(@Query() query: ListFilesDto, @Req() req: Request & { user: any }) {
    return this.fileService.listFiles(query, req.user);
  }

  @Get(':id/download')
  async downloadFile(@Param('id') id: string, @Req() req: Request & { user: any }, @Res() res: Response) {
    try {
      const objectId = new ObjectId(id);
    } catch (error) {
      throw new NotFoundException('File not found');
    }
    return this.fileService.downloadFile(id, req.user, res);
  }

  @Get(':id/users')
  async getFileUsers(@Param('id') id: string, @Req() req: Request & { user: any }) {
    return this.fileService.getFileUsers(id, req.user);
  }

  @Get(':id/user-role')
  async getFileUserRole(@Param('id') id: string, @Req() req: Request & { user: any }) {
    return this.fileService.getFileUserRole(id, req.user);
  }

  @Post('invite')
  async inviteUser(@Body() inviteDto: InviteUserDto, @Req() req: Request & { user: any }) {
    return this.fileService.inviteUser(inviteDto, req.user);
  }

  @Post('change-role')
  async changeRole(@Body() changeRoleDto: ChangeRoleDto, @Req() req: Request & { user: any }) {
    return this.fileService.changeRole(changeRoleDto, req.user);
  }

  // @Post(':id/annotation')
  // async createAnnotation(@Param('id') fileId: string, @Body() annotationDto: CreateAnnotationDto, @Req() req: Request & { user: any }) {
  //   return this.fileService.createAnnotation(fileId, annotationDto, req.user);
  // }

  // @Put(':id/annotation/:annotationId')
  // async updateAnnotation(
  //   @Param('id') fileId: string,
  //   @Param('annotationId') annotationId: string,
  //   @Body() annotationDto: CreateAnnotationDto,
  //   @Req() req: Request & { user: any },
  // ) {
  //   return this.fileService.updateAnnotation(fileId, annotationId, annotationDto, req.user);
  // }

  // @Delete(':id/annotation/:annotationId')
  // async deleteAnnotation(@Param('id') fileId: string, @Param('annotationId') annotationId: string, @Req() req: Request & { user: any }) {
  //   return this.fileService.deleteAnnotation(fileId, annotationId, req.user);
  // }

  @Post(':id/annotation/save')
  async saveAnnotation(@Param('id') fileId: string, @Body() annotationDto: CreateAnnotationDto, @Req() req: Request & { user: any }) {
    return this.fileService.saveAnnotation(fileId, annotationDto, req.user);
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string, @Req() req: Request & { user: any }) {
    return this.fileService.deleteFile(id, req.user);
  }

  @Get(':id/info')
  async getFileInfo(@Param('id') id: string) {
    return this.fileService.getFileInfo(id);
  }
}