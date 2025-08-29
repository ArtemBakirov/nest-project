import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchSongsDto {
  @IsOptional() @IsString() query?: string;
  @IsOptional() @Type(() => Number) @IsInt() page?: number; // 1-based
  @IsOptional() @Type(() => Number) @IsInt() pageSize?: number; // default 20
}
