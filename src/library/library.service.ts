import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LibraryItem,
  LibraryItemDocument,
} from './schemas/library-item.schema';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';
import {
  YtVideo,
  YtVideoDocument,
} from '../youtube-cache/schemas/yt-video.schema';
import {
  YtPlaylist,
  YtPlaylistDocument,
} from '../youtube-cache/schemas/yt-playlist.schema';
import {
  YtChannel,
  YtChannelDocument,
} from '../youtube-cache/schemas/yt-channel.schema';

@Injectable()
export class LibraryService {
  constructor(
    @InjectModel(LibraryItem.name) private lib: Model<LibraryItemDocument>,
    @InjectModel(YtVideo.name) private vids: Model<YtVideoDocument>,
    @InjectModel(YtPlaylist.name) private pls: Model<YtPlaylistDocument>,
    @InjectModel(YtChannel.name) private chs: Model<YtChannelDocument>,
  ) {}

  async add(dto: CreateLibraryItemDto) {
    const filter: any = {
      address: dto.address,
      provider: dto.provider,
      kind: dto.kind,
    };
    if (dto.kind === 'track') filter.videoId = dto.videoId;
    if (dto.kind === 'album') filter.playlistId = dto.playlistId;
    if (dto.kind === 'artist') filter.channelId = dto.channelId;

    const doc = await this.lib.findOneAndUpdate(
      filter,
      { $setOnInsert: { snapshot: dto.snapshot ?? null } },
      { upsert: true, new: true },
    );
    return doc;
  }

  async remove(address: string, provider: string, kind: string, id: string) {
    const filter: any = { address, provider, kind };
    if (kind === 'track') filter.videoId = id;
    if (kind === 'album') filter.playlistId = id;
    if (kind === 'artist') filter.channelId = id;

    const res = await this.lib.findOneAndDelete(filter);
    if (!res) throw new NotFoundException('Item not found');
    return { ok: true };
  }

  /** Return library rows with cached meta joined (fallback to snapshot) */
  async list(
    address: string,
    kind?: 'track' | 'album' | 'artist',
    page = 1,
    limit = 30,
  ) {
    const q: any = { address };
    if (kind) q.kind = kind;

    const rows = await this.lib
      .find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await this.lib.countDocuments(q);

    const videoIds = rows.filter((r) => r.videoId).map((r) => r.videoId!);
    const playlistIds = rows
      .filter((r) => r.playlistId)
      .map((r) => r.playlistId!);
    const channelIds = rows.filter((r) => r.channelId).map((r) => r.channelId!);

    const [videos, playlists, channels] = await Promise.all([
      this.vids.find({ videoId: { $in: videoIds } }).lean(),
      this.pls.find({ playlistId: { $in: playlistIds } }).lean(),
      this.chs.find({ channelId: { $in: channelIds } }).lean(),
    ]);

    const byVid = new Map(videos.map((v) => [v.videoId, v]));
    const byPl = new Map(playlists.map((p) => [p.playlistId, p]));
    const byCh = new Map(channels.map((c) => [c.channelId, c]));

    const items = rows.map((r) => {
      if (r.kind === 'track')
        return { ...r, meta: byVid.get(r.videoId!) ?? r.snapshot };
      if (r.kind === 'album')
        return { ...r, meta: byPl.get(r.playlistId!) ?? r.snapshot };
      if (r.kind === 'artist')
        return { ...r, meta: byCh.get(r.channelId!) ?? r.snapshot };
      return r;
    });

    return { items, page, total, hasNextPage: page * limit < total };
  }

  /** Batch check saved status */
  async isSavedBatch(
    address: string,
    kind: 'track' | 'album' | 'artist',
    provider: string,
    ids: string[],
  ) {
    const field =
      kind === 'track'
        ? 'videoId'
        : kind === 'album'
          ? 'playlistId'
          : 'channelId';
    const rows = await this.lib
      .find({ address, provider, kind, [field]: { $in: ids } })
      .select({ [field]: 1, _id: 0 })
      .lean();
    const set = new Set(rows.map((r) => r[field]));
    const map: Record<string, boolean> = {};
    ids.forEach((id) => (map[id] = set.has(id)));
    return map;
  }
}
