import { IsEmail, IsEnum, IsMongoId } from 'class-validator';

enum Role {
  Viewer = 'viewer',
  Editor = 'editor',
}

export class InviteUserDto {
  @IsMongoId()
  fileId: string;

  @IsEmail()
  email: string;

  @IsEnum(Role)
  role: Role;
}