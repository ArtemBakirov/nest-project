import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LibraryItem, LibraryItemSchema } from './schemas/library-item.schema';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';
import {
  YtVideo,
  YtVideoSchema,
} from '../youtube-cache/schemas/yt-video.schema';
import {
  YtPlaylist,
  YtPlaylistSchema,
} from 'src/youtube-cache/schemas/yt-playlist.schema';
import {
  YtChannel,
  YtChannelSchema,
} from 'src/youtube-cache/schemas/yt-channel.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LibraryItem.name, schema: LibraryItemSchema },
    ]),
    MongooseModule.forFeature([{ name: YtVideo.name, schema: YtVideoSchema }]),
    MongooseModule.forFeature([
      { name: YtPlaylist.name, schema: YtPlaylistSchema },
    ]),
    MongooseModule.forFeature([
      { name: YtChannel.name, schema: YtChannelSchema },
    ]),
  ],
  controllers: [LibraryController],
  providers: [LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
