import {
  IsEnum,
  IsString,
  IsObject,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import type { Song } from '../library.types';

export class CreateLibraryItemDto {
  @IsString()
  address: string; // pass it explicitly or inject via header

  @IsEnum(['track', 'album', 'artist'])
  kind: 'track' | 'album' | 'artist';

  @IsEnum(['youtube', 'jamendo'])
  provider: 'youtube' | 'jamendo';

  // Track
  @ValidateIf((o) => o.kind === 'track')
  @IsObject()
  song?: Song;

  // Album
  @ValidateIf((o) => o.kind === 'album')
  @IsString()
  playlistId?: string;

  // Artist
  @ValidateIf((o) => o.kind === 'artist')
  @IsString()
  channelId?: string;

  @IsOptional()
  _dedupe?: string;
}
