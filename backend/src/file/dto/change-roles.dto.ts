import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsEnum,
  IsOptional,
  IsEmail,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ChangeRoleDto } from './change-role.dto';
import { ApiProperty } from '@nestjs/swagger';

enum Role {
  Viewer = 'viewer',
  Editor = 'editor',
  None = 'none',
}

export class ChangeRolesDto {
  @ApiProperty({
    description: 'MongoDB ObjectId of the file',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  fileId: string;

  @ApiProperty({
    description: 'Array of role changes to apply',
    type: [ChangeRoleDto],
    example: [
      {
        fileId: '507f1f77bcf86cd799439011',
        email: 'user1@example.com',
        role: 'editor'
      },
      {
        fileId: '507f1f77bcf86cd799439011',
        email: 'user2@example.com',
        role: 'viewer'
      }
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChangeRoleDto)
  changes: ChangeRoleDto[];
}
