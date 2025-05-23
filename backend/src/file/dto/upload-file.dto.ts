import { IsNotEmpty, IsOptional } from 'class-validator';

export class UploadFileDto {
  @IsNotEmpty()
  file: Express.Multer.File;

  @IsOptional()
  googleDriveLink?: string;
}