import { IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnnotationDto {
  @ApiProperty({
    description: 'XFDF (XML Forms Data Format) content containing annotations',
    example: '<?xml version="1.0" encoding="UTF-8"?><xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve"><annots><text page="0" rect="100,100,200,200" color="#FFFF00" contents="Sample annotation"/></annots></xfdf>',
  })
  @IsString()
  xfdf: string;

  // @IsNumber()
  // version: number;
}