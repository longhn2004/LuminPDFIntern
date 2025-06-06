import { IsMongoId, IsEnum, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum Role {
  Viewer = 'viewer',
  Editor = 'editor',
  None = 'none',
}

export class ChangeRoleDto {
  @ApiProperty({
    description: 'MongoDB ObjectId of the file',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  fileId: string;

  @ApiProperty({
    description: 'Email address of the user whose role to change',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'New role to assign (use "none" to remove access)',
    enum: Role,
    example: Role.Editor,
    required: false,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}