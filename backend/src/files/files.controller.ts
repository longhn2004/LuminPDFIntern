import { Controller, Post, UploadedFile, UseInterceptors, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, HttpStatus, HttpException, Body, Req, InternalServerErrorException, Logger, Get, Param, Res, Query, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as Multer from 'multer';
import { extname } from 'path';
import { FilesService, FileDownloadDetails, EnrichedFileDetails } from './files.service';
import { IsNotEmpty, IsUUID } from 'class-validator'; // For DTO validation
import { Response } from 'express';
import * as fs from 'fs';

// A DTO for the ownerId, remove if ownerId comes from auth
// Ensure class-validator and class-transformer are installed (npm i class-validator class-transformer)
// And main.ts has app.useGlobalPipes(new ValidationPipe());
export class FileUploadDto {
  @IsNotEmpty()
  @IsUUID()
  ownerId: string; // This should ideally come from an authenticated user context
}

export class FileQueryDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;
}

@Controller('files')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const originalNameSanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').split('.')[0];
          const filename = `${originalNameSanitized}-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(pdf)$/i)) {
          return callback(new HttpException('Only PDF files are allowed!', HttpStatus.BAD_REQUEST), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
      },
    }),
  )
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
        exceptionFactory: (error: string | object) => {
          const errorMessage = typeof error === 'string' ? error : JSON.stringify(error);
          this.logger.error(`File validation failed: ${errorMessage}`);
          if (errorMessage.includes('mime type') || errorMessage.includes('application/pdf')) {
            return new HttpException('Validation failed: Only PDF files are allowed.', HttpStatus.BAD_REQUEST);
          }
          if (errorMessage.includes('expected size')) {
            return new HttpException('Validation failed: File too large (max 20MB).', HttpStatus.BAD_REQUEST);
          }
          return new HttpException(`File validation failed: ${errorMessage}`, HttpStatus.BAD_REQUEST);
        },
      }),
    )
    file: Multer.File,
    @Body() uploadDto: FileUploadDto, 
  ) {
    if (!file) {
      this.logger.error('No file uploaded or file invalid after Multer processing.');
      throw new HttpException('No valid file uploaded.', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Attempting to upload file: ${file.originalname}, by owner: ${uploadDto.ownerId}`);

    try {
      const fileRecord = await this.filesService.createFileRecord(
        {
          filename: file.originalname,
          storedFilename: file.filename, 
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
        },
        uploadDto.ownerId,
      );

      return {
        message: 'File uploaded and record created successfully',
        fileId: fileRecord.id,
        filename: fileRecord.filename,
        // Ensure owner is loaded if you want to return owner details
        // owner: fileRecord.owner ? fileRecord.owner.email : undefined, 
      };
    } catch (error) {
      this.logger.error(`Failed to create file record: ${error.message}`, error.stack);
      // Basic file cleanup if DB record creation fails. Consider more robust cleanup for production.
      const fs = require('fs'); // Use dynamic import or ensure fs is properly imported/handled
      try {
        if (fs.existsSync(file.path)) {
           fs.unlinkSync(file.path);
           this.logger.log(`Cleaned up uploaded file: ${file.path}`);
        }
      } catch (e) {
        this.logger.error(`Failed to cleanup uploaded file ${file.path}: ${e.message}`, e.stack);
      }

      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Could not save file information.');
    }
  }

  @Get(':fileId/download')
  async downloadFile(
    @Param('fileId') fileId: string,
    @Query() query: FileQueryDto,
    @Res() res: Response,
  ) {
    this.logger.log(`Attempting to download file: ${fileId} by user: ${query.userId}`);
    try {
      const { filePath, originalFilename, role } = await this.filesService.getFileForDownload(fileId, query.userId);

      if (!fs.existsSync(filePath)) {
        this.logger.error(`File not found on disk at path: ${filePath} for file ID: ${fileId}`);
        throw new NotFoundException('File not found on storage. It may have been moved or deleted.');
      }
      
      this.logger.log(`Streaming file ${originalFilename} from path ${filePath} for user ${query.userId} with role ${role}`);
      return res.download(filePath, originalFilename, (err) => {
        if (err) {
          this.logger.error(`Error streaming file ${originalFilename} to client: ${err.message}`, err.stack);
          if (!res.headersSent) {
             res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Error streaming file.'});
          }
        }
      });
    } catch (error) {
      this.logger.error(`Error during download process for file ${fileId}: ${error.message}`, error.stack);
      if (!res.headersSent) {
        if (error instanceof ForbiddenException) {
          return res.status(HttpStatus.FORBIDDEN).send({ message: error.message });
        }
        if (error instanceof NotFoundException) {
          return res.status(HttpStatus.NOT_FOUND).send({ message: error.message });
        }
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Could not process file download.' });
      }
    }
  }

  @Get(':fileId/details')
  async getFileDetails(
    @Param('fileId') fileId: string,
    @Query() query: FileQueryDto,
  ): Promise<EnrichedFileDetails> {
    this.logger.log(`Attempting to get details for file: ${fileId} by user: ${query.userId}`);
    try {
      return await this.filesService.getFileDetails(fileId, query.userId);
    } catch (error) {
      this.logger.error(`Error getting file details for file ${fileId}: ${error.message}`, error.stack);
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException(error.message);
      }
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException('Could not retrieve file details.');
    }
  }
} 