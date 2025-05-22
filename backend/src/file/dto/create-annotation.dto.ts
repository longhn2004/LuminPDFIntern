import { IsMongoId, IsString } from 'class-validator';

export class CreateAnnotationDto {
  @IsMongoId()
  fileId: string;

  @IsString()
  xml: string;
}