import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { Song } from '../library.types';

export type LibraryItemDocument = HydratedDocument<LibraryItem>;

@Schema({ timestamps: true, collection: 'library_items' })
export class LibraryItem {
  @Prop({ type: String, index: true, required: true })
  address: string; // public key / unique identity from host

  @Prop({ enum: ['track', 'album', 'artist'], index: true, required: true })
  kind: 'track' | 'album' | 'artist';

  @Prop({ enum: ['youtube', 'jamendo'], index: true, required: true })
  provider: 'youtube' | 'jamendo';

  @Prop({ type: String, unique: false }) // uniqueness enforced by compound index below
  _dedupe?: string;

  @Prop({
    type: {
      channelTitle: String,
      audioId: String,
      thumbnail: String,
      title: String,
    },
  })
  song?: Song;

  @Prop({ type: String })
  channelId?: string;

  @Prop({ type: String })
  playlistId?: string;
}

export const LibraryItemSchema = SchemaFactory.createForClass(LibraryItem);

// Compound unique index to prevent duplicates
// (existing)
LibraryItemSchema.index(
  { address: 1, kind: 1, provider: 1, 'song.audioId': 1 },
  {
    unique: true,
    partialFilterExpression: { 'song.audioId': { $type: 'string' } },
  },
);

// NEW — albums
LibraryItemSchema.index(
  { address: 1, kind: 1, provider: 1, playlistId: 1 },
  {
    unique: true,
    partialFilterExpression: { playlistId: { $type: 'string' } },
  },
);

// NEW — artists
LibraryItemSchema.index(
  { address: 1, kind: 1, provider: 1, channelId: 1 },
  {
    unique: true,
    partialFilterExpression: { channelId: { $type: 'string' } },
  },
);
