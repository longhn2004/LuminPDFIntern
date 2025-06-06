import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
 
export class AccessViaLinkDto {
  @ApiProperty({
    description: 'Shareable link token (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  token: string;
} 