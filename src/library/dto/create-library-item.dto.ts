import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateLibraryItemDto {
  @IsString() address: string;
  @IsEnum(['track', 'album', 'artist']) kind: 'track' | 'album' | 'artist';
  @IsEnum(['youtube', 'jamendo']) provider: 'youtube' | 'jamendo';

  @IsOptional() @IsString() videoId?: string;
  @IsOptional() @IsString() playlistId?: string;
  @IsOptional() @IsString() channelId?: string;

  snapshot?: {
    title: string;
    subtitle?: string;
    thumbnail?: string;
    extra?: any;
  };
}
