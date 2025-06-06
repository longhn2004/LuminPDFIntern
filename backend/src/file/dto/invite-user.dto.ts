import { IsEmail, IsEnum, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum Role {
  Viewer = 'viewer',
  Editor = 'editor',
}

export class InviteUserDto {
  @ApiProperty({
    description: 'MongoDB ObjectId of the file',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  fileId: string;

  @ApiProperty({
    description: 'Array of email addresses to invite',
    example: ['user1@example.com', 'user2@example.com'],
    type: [String],
  })
  @IsEmail({}, { each: true })
  emails: string[];

  @ApiProperty({
    description: 'Role to assign to invited users',
    enum: Role,
    example: Role.Viewer,
  })
  @IsEnum(Role)
  role: Role;
}