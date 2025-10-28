import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type YtPlaylistItemDocument = HydratedDocument<YtPlaylistItem>;

@Schema({ timestamps: true, collection: 'yt_playlist_items' })
export class YtPlaylistItem {
  @Prop({ required: true, index: true }) playlistId: string;
  @Prop({ required: true, index: true }) videoId: string;
  @Prop({ index: true }) position?: number;
  @Prop() title?: string;
  @Prop() channelTitle?: string;
  @Prop() thumbnail: string;
}
export const YtPlaylistItemSchema =
  SchemaFactory.createForClass(YtPlaylistItem);
YtPlaylistItemSchema.index({ playlistId: 1, videoId: 1 }, { unique: true });
YtPlaylistItemSchema.index({ playlistId: 1, position: 1 });
