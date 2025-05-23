import { IsMongoId, IsEnum, IsOptional, IsEmail } from 'class-validator';

enum Role {
  Viewer = 'viewer',
  Editor = 'editor',
  None = 'none',
}

export class ChangeRoleDto {
  @IsMongoId()
  fileId: string;

  @IsEmail()
  email: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}