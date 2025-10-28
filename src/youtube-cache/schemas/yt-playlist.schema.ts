import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type YtPlaylistDocument = HydratedDocument<YtPlaylist>;

@Schema({ timestamps: true, collection: 'yt_playlists' })
export class YtPlaylist {
  @Prop({ required: true, unique: true, index: true }) playlistId: string;
  @Prop() title?: string;
  @Prop() description?: string;
  @Prop() channelId?: string;
  @Prop() channelTitle?: string;
  @Prop() itemCount?: number;
  @Prop({
    type: {
      default: { type: String },
      medium: { type: String },
      high: { type: String },
      standard: { type: String },
      maxres: { type: String },
    },
  })
  thumbnails?: {
    default?: string;
    medium?: string;
    high?: string;
    standard?: string;
    maxres?: string;
  };
  @Prop() etag?: string;
  @Prop() lastFetchedAt?: Date;
}
export const YtPlaylistSchema = SchemaFactory.createForClass(YtPlaylist);
