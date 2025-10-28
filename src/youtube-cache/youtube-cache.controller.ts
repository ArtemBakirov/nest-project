import { Controller, Get, Query, Param } from '@nestjs/common';
import { YoutubeCacheService } from './youtube-cache.service';

@Controller('yt')
export class YoutubeCacheController {
  constructor(private svc: YoutubeCacheService) {}

  // ---- SEARCH ----
  @Get('search/videos')
  searchVideos(
    @Query('q') q: string,
    @Query('channelId') channelId: string,
    @Query('key') key: string,
    @Query('max') max?: string,
    @Query('pageToken') pageToken?: string,
  ) {
    return this.svc.searchVideosPaged(
      q,
      channelId,
      key,
      Number(max ?? 24),
      pageToken,
    );
  }

  @Get('search/playlists')
  searchPlaylists(
    @Query('q') q: string,
    @Query('channelId') channelId: string,
    @Query('key') key: string,
    @Query('max') max?: string,
    @Query('pageToken') pageToken?: string,
  ) {
    return this.svc.searchPlaylistsPaged(
      q,
      channelId,
      key,
      Number(max ?? 24),
      pageToken,
    );
  }

  @Get('search/channels')
  searchChannels(
    @Query('q') q: string,
    @Query('key') key: string,
    @Query('max') max?: string,
    @Query('pageToken') pageToken?: string,
  ) {
    return this.svc.searchChannelsPaged(q, key, Number(max ?? 24), pageToken);
  }

  // ---- CHANNEL ----
  @Get('channel/:id')
  getChannel(@Param('id') id: string, @Query('key') key: string) {
    return this.svc.getChannelMeta(key, id);
  }

  // ---- PLAYLIST ----
  @Get('playlist/:id')
  getPlaylist(@Param('id') id: string, @Query('key') key: string) {
    return this.svc.getPlaylistMeta(key, id);
  }

  @Get('playlist/:id/items')
  getPlaylistItems(
    @Param('id') id: string,
    @Query('key') key: string,
    @Query('max') max?: string,
    @Query('pageToken') pageToken?: string,
  ) {
    return this.svc.getPlaylistItemsPaged(
      key,
      id,
      Number(max ?? 25),
      pageToken,
    );
  }
}
