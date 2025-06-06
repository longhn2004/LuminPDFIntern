import { IsEnum, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum Role {
  Viewer = 'viewer',
  Editor = 'editor',
}

export class CreateShareableLinkDto {
  @ApiProperty({
    description: 'MongoDB ObjectId of the file',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  fileId: string;

  @ApiProperty({
    description: 'Access level for the shareable link',
    enum: Role,
    example: Role.Viewer,
  })
  @IsEnum(Role)
  role: Role;
} 