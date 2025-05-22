import { IsEmail, IsEnum, IsMongoId } from 'class-validator';

enum Role {
  Viewer = 'viewer',
  Editor = 'editor',
}

export class InviteUserDto {
  @IsMongoId()
  fileId: string;

  @IsEmail({}, { each: true })
  emails: string[];

  @IsEnum(Role)
  role: Role;
}