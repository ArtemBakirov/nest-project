import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type YtSearchPageDocument = HydratedDocument<YtSearchPage>;

/**
 * Cache of one YouTube Search page result.
 * We store *IDs only*; details live in yt_videos / yt_playlists / yt_channels.
 */
@Schema({ timestamps: true, collection: 'yt_search_pages' })
export class YtSearchPage {
  @Prop({ enum: ['video', 'playlist', 'channel'], required: true, index: true })
  kind: 'video' | 'playlist' | 'channel';

  @Prop({ type: String, default: '', index: true }) q!: string; // search query
  @Prop({ type: String, default: '', index: true }) channelId!: string; // optional filter
  @Prop({ required: true }) max!: number;
  @Prop({ type: String, default: '', index: true }) pageToken!: string; // empty for first page

  // Store only the IDs we got from YT
  @Prop({ type: [String], default: [] }) ids!: string[];

  @Prop() nextPageToken?: string;

  // stale control
  @Prop({ type: Date }) lastFetchedAt?: Date;
}

export const YtSearchPageSchema = SchemaFactory.createForClass(YtSearchPage);

// To make lookups fast
YtSearchPageSchema.index(
  { kind: 1, q: 1, channelId: 1, max: 1, pageToken: 1 },
  { unique: true },
);
