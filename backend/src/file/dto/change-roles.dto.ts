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

enum Role {
  Viewer = 'viewer',
  Editor = 'editor',
  None = 'none',
}

export class ChangeRolesDto {
  @IsMongoId()
  fileId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChangeRoleDto)
  changes: ChangeRoleDto[];
}
