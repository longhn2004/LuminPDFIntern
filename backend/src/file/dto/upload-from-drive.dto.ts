import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadFromDriveDto {
  @ApiProperty({
    description: 'Google Drive file ID (extracted from share link)',
    example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    pattern: '^[a-zA-Z0-9_-]{10,}$',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{10,}$/, {
    message: 'Invalid Google Drive file ID format'
  })
  fileId: string;
} 