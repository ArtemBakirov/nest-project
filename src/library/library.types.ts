export type Provider = 'youtube' | 'jamendo';

export type LibraryKind = 'track' | 'album' | 'artist';

export interface LibraryItemSnapshot {
  title: string;
  subtitle?: string; // channel / artist name
  thumbnail: string; // URL
  extra?: Record<string, any>; // duration, etc. (optional)
}

export interface LibraryItemDTO {
  kind: LibraryKind;
  provider: Provider;
  externalId: string; // YT: videoId | playlistId | channelId
  snapshot?: LibraryItemSnapshot; // denormalized for quick display
}
