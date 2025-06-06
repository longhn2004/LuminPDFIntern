import { IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadFileDto {
  @ApiProperty({
    description: 'PDF file to upload',
    type: 'string',
    format: 'binary',
  })
  @IsNotEmpty()
  file: Express.Multer.File;

  @ApiProperty({
    description: 'Optional Google Drive file link',
    example: 'https://drive.google.com/file/d/1ABC123/view',
    required: false,
  })
  @IsOptional()
  googleDriveLink?: string;
}