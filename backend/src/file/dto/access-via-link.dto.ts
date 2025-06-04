import { IsString } from 'class-validator';
 
export class AccessViaLinkDto {
  @IsString()
  token: string;
} 