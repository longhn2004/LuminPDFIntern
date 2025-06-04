import { IsEnum, IsMongoId } from 'class-validator';

enum Role {
  Viewer = 'viewer',
  Editor = 'editor',
}

export class CreateShareableLinkDto {
  @IsMongoId()
  fileId: string;

  @IsEnum(Role)
  role: Role;
} 