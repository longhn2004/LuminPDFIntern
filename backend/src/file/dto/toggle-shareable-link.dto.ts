import { IsBoolean, IsMongoId } from 'class-validator';

export class ToggleShareableLinkDto {
  @IsMongoId()
  fileId: string;
 
  @IsBoolean()
  enabled: boolean;
} 