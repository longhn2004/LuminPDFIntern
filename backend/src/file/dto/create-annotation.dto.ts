import { IsString } from 'class-validator';

export class CreateAnnotationDto {
  @IsString()
  xfdf: string;
}