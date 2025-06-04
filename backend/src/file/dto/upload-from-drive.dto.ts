import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UploadFromDriveDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{10,}$/, {
    message: 'Invalid Google Drive file ID format'
  })
  fileId: string;
} 