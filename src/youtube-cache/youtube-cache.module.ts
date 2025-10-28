// youtube-cache/youtube-cache.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { YoutubeCacheService } from './youtube-cache.service';
import { YoutubeCacheController } from './youtube-cache.controller';
import { YtVideo, YtVideoSchema } from './schemas/yt-video.schema';
import { YtPlaylist, YtPlaylistSchema } from './schemas/yt-playlist.schema';
import {
  YtPlaylistItem,
  YtPlaylistItemSchema,
} from './schemas/yt-playlist-item.schema';
import { YtChannel, YtChannelSchema } from './schemas/yt-channel.schema';
import {
  YtChannelPlaylistRef,
  YtChannelPlaylistRefSchema,
} from './schemas/yt-channel-playlist-ref.schema';
import {
  YtSearchPage,
  YtSearchPageSchema,
} from './schemas/yt-search-page.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: YtVideo.name, schema: YtVideoSchema },
      { name: YtPlaylist.name, schema: YtPlaylistSchema },
      { name: YtPlaylistItem.name, schema: YtPlaylistItemSchema },
      { name: YtChannel.name, schema: YtChannelSchema },
      { name: YtChannelPlaylistRef.name, schema: YtChannelPlaylistRefSchema },
      { name: YtSearchPage.name, schema: YtSearchPageSchema },
    ]),
  ],
  controllers: [YoutubeCacheController],
  providers: [YoutubeCacheService],
  exports: [YoutubeCacheService],
})
export class YoutubeCacheModule {}
