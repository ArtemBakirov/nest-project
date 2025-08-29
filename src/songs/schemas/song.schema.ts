import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SongDocument = HydratedDocument<Song>;

@Schema({ timestamps: true })
export class Song {
  @Prop({ required: true, index: true })
  cid: string; // IPFS CID (encrypted object)

  @Prop({ required: true, index: true })
  title: string;

  @Prop({ index: true })
  artist?: string;

  @Prop()
  album?: string;

  @Prop({ type: [String], default: [], index: true })
  genres: string[];

  @Prop({ type: [String], default: [] })
  keywords: string[];

  @Prop()
  language?: string;

  @Prop()
  durationSecs?: number;

  @Prop()
  mime?: string; // e.g. 'audio/mpeg'

  @Prop()
  bytes?: number;

  @Prop({ default: true })
  isEncrypted: boolean;

  @Prop({ index: true })
  uploaderId?: string; // your app’s user ID

  @Prop()
  hlsMasterCid?: string; // optional for HLS

  // createdAt/updatedAt provided by timestamps: true
}

export const SongSchema = SchemaFactory.createForClass(Song);

// Text index for full-text search with weights
SongSchema.index(
  {
    title: 'text',
    artist: 'text',
    album: 'text',
    genres: 'text',
    keywords: 'text',
  },
  {
    weights: { title: 8, artist: 6, album: 3, genres: 3, keywords: 2 },
    name: 'songs_text_idx',
  },
);

// Helpful compound index (e.g., for user library pages and recents)
SongSchema.index({ uploaderId: 1, createdAt: -1 });
