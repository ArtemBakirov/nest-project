import { IsEnum, IsString, IsObject } from 'class-validator';
import type { Song } from '../library.types';

export class CreateLibraryItemDto {
  @IsString()
  address: string; // pass it explicitly or inject via header

  @IsEnum(['track', 'album', 'artist'])
  kind: 'track' | 'album' | 'artist';

  @IsEnum(['youtube', 'jamendo'])
  provider: 'youtube' | 'jamendo';

  @IsObject()
  song: Song;
}
