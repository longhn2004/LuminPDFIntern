import { IsInt, Min, IsOptional, IsIn } from 'class-validator';

export class ListFilesDto {
  @IsInt()
  @Min(0)
  page: number = 0;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort?: 'ASC' | 'DESC' = 'DESC';
}
