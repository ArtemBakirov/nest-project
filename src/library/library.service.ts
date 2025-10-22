import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LibraryItem,
  LibraryItemDocument,
} from './schemas/library-item.schema';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';

type Kind = 'track' | 'album' | 'artist';

function resolveKindKey(kind: Kind) {
  // the field used to uniquely identify each kind
  switch (kind) {
    case 'track':
      return 'song.audioId' as const;
    case 'album':
      return 'playlistId' as const;
    case 'artist':
      return 'channelId' as const;
    default:
      // TS safeguard
      return 'song.audioId' as const;
  }
}

function extractKindId(dto: CreateLibraryItemDto): string | undefined {
  if (dto.kind === 'track') return dto.song?.audioId;
  if (dto.kind === 'album') return dto.playlistId;
  if (dto.kind === 'artist') return dto.channelId;
  return undefined;
}

@Injectable()
export class LibraryService {
  constructor(
    @InjectModel(LibraryItem.name)
    private readonly model: Model<LibraryItemDocument>,
  ) {}

  async add(dto: CreateLibraryItemDto) {
    console.log('dto add', dto);
    const kindKey = resolveKindKey(dto.kind);
    const kindId = extractKindId(dto);

    if (!kindId) {
      throw new BadRequestException(
        `Missing identifier for kind="${dto.kind}". Expected ${
          dto.kind === 'track'
            ? 'song.audioId'
            : dto.kind === 'album'
              ? 'playlistId'
              : 'channelId'
        }.`,
      );
    }

    try {
      // normal create
      const doc = await this.model.create(dto);
      return doc;
    } catch (e: any) {
      // idempotent add (duplicate)
      if (e?.code === 11000) {
        const existing = await this.model.findOne({
          address: dto.address,
          kind: dto.kind,
          provider: dto.provider,
          [kindKey]: kindId,
        });
        return existing;
      }
      console.log('error adding', e);
      throw e;
    }
  }

  async remove(
    address: string,
    kind: Kind,
    provider: 'youtube' | 'jamendo',
    id: string, // audioId | playlistId | channelId, depending on kind
  ) {
    const kindKey = resolveKindKey(kind);

    const res = await this.model.findOneAndDelete({
      address,
      kind,
      provider,
      [kindKey]: id,
    });

    if (!res) throw new NotFoundException('Item not found');
    return { ok: true };
  }

  async list(address: string, kind?: Kind, page = 1, limit = 30) {
    const q: any = { address };
    if (kind) q.kind = kind;

    const items = await this.model
      .find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await this.model.countDocuments(q);
    return { items, page, total, hasNextPage: page * limit < total };
  }

  async isSavedBatch(
    address: string,
    kind: Kind,
    provider: 'youtube' | 'jamendo',
    ids: string[], // audioIds for tracks, playlistIds for albums, channelIds for artists
  ) {
    const kindKey = resolveKindKey(kind);

    const rows = await this.model
      .find({ address, kind, provider, [kindKey]: { $in: ids } })
      .select({ [kindKey]: 1, _id: 0 })
      .lean();

    // Normalize to a Set of strings
    const pickedKey = kindKey as 'song.audioId' | 'playlistId' | 'channelId';
    const set = new Set<string>(
      rows
        .map((r: any) =>
          pickedKey === 'song.audioId' ? r?.song?.audioId : r?.[pickedKey],
        )
        .filter(Boolean),
    );

    const map: Record<string, boolean> = {};
    ids.forEach((id) => {
      map[id] = set.has(id);
    });
    return map;
  }
}
