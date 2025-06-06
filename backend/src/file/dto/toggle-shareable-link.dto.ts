import { IsBoolean, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleShareableLinkDto {
  @ApiProperty({
    description: 'MongoDB ObjectId of the file',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  fileId: string;
 
  @ApiProperty({
    description: 'Whether to enable or disable shareable links for this file',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;
} 