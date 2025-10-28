import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'yt_channel_playlists' })
export class YtChannelPlaylistRef {
  @Prop({ required: true, index: true }) channelId: string;
  @Prop({ required: true, index: true }) playlistId: string;
  @Prop() title?: string;
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
}
export const YtChannelPlaylistRefSchema =
  SchemaFactory.createForClass(YtChannelPlaylistRef);
YtChannelPlaylistRefSchema.index(
  { channelId: 1, playlistId: 1 },
  { unique: true },
);
