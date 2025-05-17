import { IsMongoId, IsEnum, IsOptional } from 'class-validator';

enum Role {
  Viewer = 'viewer',
  Editor = 'editor',
  None = 'none',
}

export class ChangeRoleDto {
  @IsMongoId()
  fileId: string;

  @IsMongoId()
  userId: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}