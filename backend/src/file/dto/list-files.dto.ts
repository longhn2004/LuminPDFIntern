import { IsInt, Min, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ListFilesDto {
  @ApiProperty({
    description: 'Page number for pagination (0-based)',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsInt()
  @Min(0)
  page: number = 0;

  @ApiProperty({
    description: 'Sort order for files by update date',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
    default: 'DESC',
    required: false,
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort?: 'ASC' | 'DESC' = 'DESC';
}
