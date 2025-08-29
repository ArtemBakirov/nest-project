import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UserDto {
  @IsString()
  address!: string;

  @IsString()
  @MaxLength(50)
  username!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
