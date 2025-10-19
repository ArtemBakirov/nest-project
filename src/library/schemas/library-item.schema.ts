import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LibraryItemDocument = HydratedDocument<LibraryItem>;

@Schema({ timestamps: true, collection: 'library_items' })
export class LibraryItem {
  @Prop({ type: String, index: true, required: true })
  address: string; // public key / unique identity from host

  @Prop({ enum: ['track', 'album', 'artist'], index: true, required: true })
  kind: 'track' | 'album' | 'artist';

  @Prop({ enum: ['youtube', 'jamendo'], index: true, required: true })
  provider: 'youtube' | 'jamendo';

  // videoId / playlistId / channelId (or jamendo ids)
  @Prop({ type: String, index: true, required: true })
  externalId: string;

  // avoid duplicates per user+kind+provider+externalId
  @Prop({ type: String, unique: false }) // uniqueness enforced by compound index below
  _dedupe?: string;

  @Prop({
    type: {
      title: String,
      subtitle: String,
      thumbnail: String,
      extra: Object,
    },
  })
  snapshot?: {
    title: string;
    subtitle?: string;
    thumbnail: string;
    extra?: Record<string, any>;
  };
}

export const LibraryItemSchema = SchemaFactory.createForClass(LibraryItem);

// Compound unique index to prevent duplicates
LibraryItemSchema.index(
  { userId: 1, kind: 1, provider: 1, externalId: 1 },
  { unique: true },
);
