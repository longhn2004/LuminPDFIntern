import { IsNumber, IsString } from 'class-validator';

export class CreateAnnotationDto {
  @IsString()
  xfdf: string;

  // @IsNumber()
  // version: number;
}