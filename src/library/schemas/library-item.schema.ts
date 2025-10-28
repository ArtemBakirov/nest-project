// library/schemas/library-item.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LibraryItemDocument = HydratedDocument<LibraryItem>;

@Schema({ timestamps: true, collection: 'library_items' })
export class LibraryItem {
  @Prop({ required: true, index: true }) address: string;
  @Prop({ enum: ['track', 'album', 'artist'], required: true, index: true })
  kind: 'track' | 'album' | 'artist';
  @Prop({ enum: ['youtube', 'jamendo'], required: true, index: true })
  provider: 'youtube' | 'jamendo';

  // one of these, depending on kind
  @Prop() videoId?: string; // track
  @Prop() playlistId?: string; // album
  @Prop() channelId?: string; // artist

  // small card snapshot for instant rendering
  @Prop({ type: Object })
  snapshot?: {
    title: string;
    subtitle?: string;
    thumbnail?: string;
    extra?: Record<string, any>;
  };
}
export const LibraryItemSchema = SchemaFactory.createForClass(LibraryItem);

LibraryItemSchema.index(
  { address: 1, provider: 1, kind: 1, videoId: 1 },
  { unique: true, partialFilterExpression: { videoId: { $type: 'string' } } },
);
LibraryItemSchema.index(
  { address: 1, provider: 1, kind: 1, playlistId: 1 },
  {
    unique: true,
    partialFilterExpression: { playlistId: { $type: 'string' } },
  },
);
LibraryItemSchema.index(
  { address: 1, provider: 1, kind: 1, channelId: 1 },
  { unique: true, partialFilterExpression: { channelId: { $type: 'string' } } },
);
