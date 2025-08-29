import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
} from 'class-validator';

export class CreateSongDto {
  @IsString() cid!: string;
  @IsString() title!: string;

  @IsOptional() @IsString() artist?: string;
  @IsOptional() @IsString() album?: string;
  @IsOptional() @IsArray() genres?: string[];
  @IsOptional() @IsArray() keywords?: string[];
  @IsOptional() @IsString() language?: string;

  @IsOptional() @IsNumber() durationSecs?: number;
  @IsOptional() @IsString() mime?: string;
  @IsOptional() @IsNumber() bytes?: number;

  @IsOptional() @IsBoolean() isEncrypted?: boolean; // defaults true on server if omitted
  @IsOptional() @IsString() uploaderId?: string;
  @IsOptional() @IsString() hlsMasterCid?: string;
}
