import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateLibraryItemDto {
  @IsString()
  address: string; // pass it explicitly or inject via header

  @IsEnum(['track', 'album', 'artist'])
  kind: 'track' | 'album' | 'artist';

  @IsEnum(['youtube', 'jamendo'])
  provider: 'youtube' | 'jamendo';

  @IsString()
  externalId: string;

  @IsOptional()
  @IsObject()
  snapshot?: {
    title: string;
    subtitle?: string;
    thumbnail: string;
    extra?: Record<string, any>;
  };
}
