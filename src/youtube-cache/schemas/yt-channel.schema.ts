// youtube-cache/schemas/yt-channel.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type YtChannelDocument = HydratedDocument<YtChannel>;

@Schema({ timestamps: true, collection: 'yt_channels' })
export class YtChannel {
  @Prop({ required: true, unique: true, index: true }) channelId: string;
  @Prop() title?: string;
  @Prop() avatar?: string;
  @Prop() banner?: string;
  @Prop() unsubscribedTrailer?: string;
  @Prop() etag?: string;
  @Prop() lastFetchedAt?: Date;
}
export const YtChannelSchema = SchemaFactory.createForClass(YtChannel);
