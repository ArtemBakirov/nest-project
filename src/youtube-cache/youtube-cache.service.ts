import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { YtVideo, YtVideoDocument } from './schemas/yt-video.schema';
import { YtPlaylist, YtPlaylistDocument } from './schemas/yt-playlist.schema';
import {
  YtPlaylistItem,
  YtPlaylistItemDocument,
} from './schemas/yt-playlist-item.schema';
import { YtChannel, YtChannelDocument } from './schemas/yt-channel.schema';
import { HttpService } from '@nestjs/axios';
import {
  YtSearchPage,
  YtSearchPageDocument,
} from './schemas/yt-search-page.schema';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const STALE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

@Injectable()
export class YoutubeCacheService {
  constructor(
    private http: HttpService,
    @InjectModel(YtVideo.name) private vids: Model<YtVideoDocument>,
    @InjectModel(YtPlaylist.name) private pls: Model<YtPlaylistDocument>,
    @InjectModel(YtPlaylistItem.name)
    private plItems: Model<YtPlaylistItemDocument>,
    @InjectModel(YtChannel.name) private chs: Model<YtChannelDocument>,
    @InjectModel(YtSearchPage.name)
    private searchPages: Model<YtSearchPageDocument>,
  ) {}

  private isStale(last?: Date) {
    if (!last) return true;
    return Date.now() - last.getTime() > STALE_MS;
  }

  /** Generic fetch helper */
  private async fetchJSON(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube fetch failed (${res.status})`);
    return res.json();
  }

  /** -----------------------------
   *  SEARCH ENDPOINTS
   *  ----------------------------- */

  async searchVideosPaged(
    q: string,
    channelId: string,
    key: string,
    max = 24,
    pageToken?: string,
  ) {
    const cached = await this.searchPages
      .findOne({
        kind: 'video',
        q,
        channelId: channelId || '',
        max,
        pageToken,
      })
      .lean();

    if (cached && !this.isStale(cached.lastFetchedAt)) {
      // resolve minimal info from yt_videos
      const docs = await this.vids
        .find(
          { videoId: { $in: cached.ids } },
          { videoId: 1, title: 1, channelTitle: 1, thumbnails: 1 },
        )
        .lean();

      // keep original order by ids
      const byId = new Map(docs.map((d) => [d.videoId, d]));
      const items = cached.ids.map((id) => {
        const d = byId.get(id);
        const thumb =
          d?.thumbnails?.high ??
          d?.thumbnails?.medium ??
          d?.thumbnails?.default ??
          '';
        return {
          id,
          title: d?.title ?? '',
          channelTitle: d?.channelTitle ?? '',
          thumbnail: thumb || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        };
      });

      return { items, nextPageToken: cached.nextPageToken };
    }

    // 2) miss -> call YT and seed
    const url = new URL(`${API_BASE}/search`);
    url.searchParams.set('part', 'snippet');
    if (q) url.searchParams.set('q', q);
    if (channelId) url.searchParams.set('channelId', channelId);
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', String(max));
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    url.searchParams.set('key', key);

    const json = await this.fetchJSON(url.toString());
    const ids: string[] = [];
    const items = (json.items ?? [])
      .map((it: any) => {
        const s = it.snippet;
        const id = it.id?.videoId;
        if (!id) return null;
        ids.push(id);
        const thumb =
          s?.thumbnails?.high?.url ||
          s?.thumbnails?.medium?.url ||
          s?.thumbnails?.default?.url ||
          '';
        return {
          id,
          title: s.title,
          channelTitle: s.channelTitle,
          thumbnail: thumb || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        };
      })
      .filter(Boolean);

    // upsert minimal videos
    if (ids.length) {
      await this.vids.bulkWrite(
        items.map((v) => ({
          updateOne: {
            filter: { videoId: v.id },
            update: {
              $setOnInsert: {
                title: v.title,
                channelTitle: v.channelTitle,
                thumbnails: { default: v.thumbnail },
                lastFetchedAt: new Date(0),
              },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    // store page
    await this.searchPages.updateOne(
      { kind: 'video', q, channelId: '', max, pageToken },
      {
        $set: {
          ids,
          nextPageToken: json.nextPageToken,
          lastFetchedAt: new Date(),
        },
      },
      { upsert: true },
    );
    return { items, nextPageToken: json.nextPageToken };
  }

  async searchPlaylistsPaged(
    q: string,
    channelId: string,
    key: string,
    max = 24,
    pageToken = '',
  ) {
    const cached = await this.searchPages
      .findOne({
        kind: 'playlist',
        q,
        channelId: channelId || '',
        max,
        pageToken,
      })
      .lean();

    if (cached && !this.isStale(cached.lastFetchedAt)) {
      const docs = await this.pls
        .find(
          { playlistId: { $in: cached.ids } },
          { playlistId: 1, title: 1, channelTitle: 1, thumbnails: 1 },
        )
        .lean();

      const byId = new Map(docs.map((d) => [d.playlistId, d]));
      const items = cached.ids.map((id) => {
        const d = byId.get(id);
        const thumb =
          d?.thumbnails?.high ??
          d?.thumbnails?.medium ??
          d?.thumbnails?.default ??
          '';
        return {
          id,
          title: d?.title ?? 'Playlist',
          channelTitle: d?.channelTitle ?? '',
          thumbnail: thumb,
        };
      });

      return { items, nextPageToken: cached.nextPageToken };
    }

    // miss -> YT
    const url = new URL(`${API_BASE}/search`);
    url.searchParams.set('part', 'snippet');
    if (q) url.searchParams.set('q', q);
    if (channelId) url.searchParams.set('channelId', channelId);
    url.searchParams.set('type', 'playlist');
    url.searchParams.set('maxResults', String(max));
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    url.searchParams.set('key', key);

    const json = await this.fetchJSON(url.toString());
    const ids: string[] = [];
    const items = (json.items ?? [])
      .map((it: any) => {
        const s = it.snippet;
        const id = it.id?.playlistId;
        if (!id) return null;
        ids.push(id);
        const thumb =
          s?.thumbnails?.high?.url ||
          s?.thumbnails?.medium?.url ||
          s?.thumbnails?.default?.url ||
          '';
        return {
          id,
          title: s.title,
          channelTitle: s.channelTitle,
          thumbnail: thumb,
        };
      })
      .filter(Boolean);

    // seed playlists
    if (ids.length) {
      await this.pls.bulkWrite(
        items.map((p) => ({
          updateOne: {
            filter: { playlistId: p.id },
            update: {
              $setOnInsert: {
                title: p.title,
                channelTitle: p.channelTitle,
                thumbnails: { default: p.thumbnail },
                lastFetchedAt: new Date(0),
              },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    await this.searchPages.updateOne(
      { kind: 'playlist', q, channelId: channelId || '', max, pageToken },
      {
        $set: {
          ids,
          nextPageToken: json.nextPageToken,
          lastFetchedAt: new Date(),
        },
      },
      { upsert: true },
    );

    return { items, nextPageToken: json.nextPageToken };
  }

  /** -----------------------------
   *  SEARCH: CHANNELS  (cached)
   *  ----------------------------- */
  async searchChannelsPaged(q: string, key: string, max = 24, pageToken = '') {
    const cached = await this.searchPages
      .findOne({
        kind: 'channel',
        q,
        channelId: '',
        max,
        pageToken,
      })
      .lean();

    if (cached && !this.isStale(cached.lastFetchedAt)) {
      const docs = await this.chs
        .find(
          { channelId: { $in: cached.ids } },
          { channelId: 1, title: 1, avatar: 1 },
        )
        .lean();

      const byId = new Map(docs.map((d) => [d.channelId, d]));
      const items = cached.ids.map((id) => {
        const d = byId.get(id);
        return {
          id,
          title: d?.title ?? '',
          thumbnail: d?.avatar ?? '',
        };
      });

      return { items, nextPageToken: cached.nextPageToken };
    }

    // miss -> YT
    const url = new URL(`${API_BASE}/search`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', q);
    url.searchParams.set('type', 'channel');
    url.searchParams.set('maxResults', String(max));
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    url.searchParams.set('key', key);

    const json = await this.fetchJSON(url.toString());
    const ids: string[] = [];
    const items = (json.items ?? [])
      .map((it: any) => {
        const s = it.snippet;
        const id = it.id?.channelId;
        if (!id) return null;
        ids.push(id);
        const thumb =
          s?.thumbnails?.high?.url ||
          s?.thumbnails?.medium?.url ||
          s?.thumbnails?.default?.url ||
          '';
        return {
          id,
          title: s.channelTitle || s.title,
          thumbnail: thumb,
        };
      })
      .filter(Boolean);

    // seed channels
    if (ids.length) {
      await this.chs.bulkWrite(
        items.map((c) => ({
          updateOne: {
            filter: { channelId: c.id },
            update: {
              $setOnInsert: {
                title: c.title,
                avatar: c.thumbnail,
                lastFetchedAt: new Date(0),
              },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    await this.searchPages.updateOne(
      { kind: 'channel', q, channelId: '', max, pageToken },
      {
        $set: {
          ids,
          nextPageToken: json.nextPageToken,
          lastFetchedAt: new Date(),
        },
      },
      { upsert: true },
    );

    return { items, nextPageToken: json.nextPageToken };
  }

  /** -----------------------------
   *  CHANNEL / PLAYLIST META
   *  ----------------------------- */

  async getChannelMeta(key: string, channelId: string) {
    const cached = await this.chs.findOne({ channelId }).lean();
    if (cached && !this.isStale(cached.lastFetchedAt)) return cached;

    const url = new URL(`${API_BASE}/channels`);
    url.searchParams.set('part', 'snippet,brandingSettings');
    url.searchParams.set('id', channelId);
    url.searchParams.set('key', key);

    const json = await this.fetchJSON(url.toString());
    const item = json.items?.[0];
    if (!item) throw new Error('Channel not found');

    const payload = {
      channelId,
      title: item.snippet?.title ?? 'Channel',
      avatar:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        null,
      banner: item.brandingSettings?.image?.bannerExternalUrl
        ? `${item.brandingSettings.image.bannerExternalUrl}=w2120`
        : null,
      unsubscribedTrailer:
        item.brandingSettings?.channel?.unsubscribedTrailer ?? null,
      lastFetchedAt: new Date(),
    };

    await this.chs.updateOne(
      { channelId },
      { $set: payload },
      { upsert: true },
    );
    return payload;
  }

  async getPlaylistMeta(key: string, playlistId: string) {
    const cached = await this.pls.findOne({ playlistId }).lean();
    if (cached && !this.isStale(cached.lastFetchedAt)) return cached;

    const url = new URL(`${API_BASE}/playlists`);
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('id', playlistId);
    url.searchParams.set('key', key);

    const json = await this.fetchJSON(url.toString());
    const p = json.items?.[0];
    if (!p) throw new Error('Playlist not found');

    const s = p.snippet;
    const t = s.thumbnails ?? {};
    const payload = {
      playlistId: p.id,
      title: s.title ?? 'Playlist',
      description: s.description ?? null,
      channelId: s.channelId ?? '',
      channelTitle: s.channelTitle ?? '',
      itemCount: p.contentDetails?.itemCount ?? 0,
      thumbnails: {
        default: t.default?.url,
        medium: t.medium?.url,
        high: t.high?.url,
      },
      lastFetchedAt: new Date(),
    };

    await this.pls.updateOne(
      { playlistId },
      { $set: payload },
      { upsert: true },
    );
    return payload;
  }

  async getPlaylistItemsPaged(
    key: string,
    playlistId: string,
    max = 25,
    pageToken?: string, // still pass-through YouTube tokens when we have to
  ) {
    // Try serving from cached items (simple offset pagination by _id)
    // If you prefer to mimic pageToken exactly, add a separate page cache similar to searchPages.
    const count = await this.plItems.countDocuments({ playlistId });
    if (count > 0 && !pageToken) {
      // first "page" from mongo cache
      const rows = await this.plItems
        .find(
          { playlistId },
          { videoId: 1, title: 1, channelTitle: 1, thumbnail: 1, _id: 1 },
        )
        .sort({ _id: 1 })
        .limit(max + 1)
        .lean();

      const hasMore = rows.length > max;
      const slice = hasMore ? rows.slice(0, max) : rows;

      return {
        items: slice.map((r) => ({
          videoId: r.videoId,
          title: r.title,
          channelTitle: r.channelTitle,
          thumbnail: r?.thumbnail,
        })),
        nextPageToken: hasMore
          ? String(slice[slice.length - 1]._id)
          : undefined, // simple cursor
      };
    }

    // Fallback to YouTube (or when client provides pageToken we don't know)
    const url = new URL(`${API_BASE}/playlistItems`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('playlistId', playlistId);
    url.searchParams.set('maxResults', String(max));
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    url.searchParams.set('key', key);

    const json = await this.fetchJSON(url.toString());

    const items = (json.items ?? [])
      .map((it: any) => {
        const s = it.snippet;
        const videoId = s?.resourceId?.videoId;
        if (!videoId) return null;
        const thumb =
          s?.thumbnails?.high?.url ??
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        return {
          videoId,
          title: s.title,
          channelTitle: s.channelTitle,
          thumbnail: thumb,
        };
      })
      .filter(Boolean);

    // upsert items into cache for next time
    if (items.length) {
      await this.plItems.bulkWrite(
        items.map((it) => ({
          updateOne: {
            filter: { playlistId, videoId: it.videoId },
            update: {
              $setOnInsert: {
                playlistId,
                videoId: it.videoId,
                title: it.title,
                channelTitle: it.channelTitle,
                thumbnail: it.thumbnail,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    // ✅ Also seed videos in yt_videos (new addition)
    await this.vids.bulkWrite(
      items.map((v) => ({
        updateOne: {
          filter: { videoId: v.videoId },
          update: {
            $setOnInsert: {
              title: v.title,
              channelTitle: v.channelTitle,
              thumbnails: { default: v.thumbnail },
              lastFetchedAt: new Date(),
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );

    return { items, nextPageToken: json.nextPageToken };
  }
}
