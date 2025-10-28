// youtube-cache/schemas/yt-video.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type YtVideoDocument = HydratedDocument<YtVideo>;

@Schema({ timestamps: true, collection: 'yt_videos' })
export class YtVideo {
  @Prop({ required: true, unique: true, index: true }) videoId: string;
  @Prop() title?: string;
  @Prop() channelId?: string;
  @Prop() channelTitle?: string;
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
  @Prop() duration?: string; // ISO 8601
  @Prop({ type: Object }) statistics?: any;
  @Prop() etag?: string; // from API response
  @Prop() lastFetchedAt?: Date; // staleness control
}
export const YtVideoSchema = SchemaFactory.createForClass(YtVideo);
