import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LibraryItem,
  LibraryItemDocument,
} from './schemas/library-item.schema';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';

@Injectable()
export class LibraryService {
  constructor(
    @InjectModel(LibraryItem.name)
    private readonly model: Model<LibraryItemDocument>,
  ) {}

  async add(dto: CreateLibraryItemDto) {
    console.log('dto in add', dto);
    try {
      const doc = await this.model.create(dto);
      return doc;
    } catch (e: any) {
      if (e?.code === 11000) {
        // duplicate (idempotent add)
        const existing = await this.model.findOne({
          address: dto.address,
          kind: dto.kind,
          provider: dto.provider,
          externalId: dto.externalId,
        });
        return existing;
      }
      throw e;
    }
  }

  async remove(
    address: string,
    kind: string,
    provider: string,
    externalId: string,
  ) {
    const res = await this.model.findOneAndDelete({
      address,
      kind,
      provider,
      externalId,
    });
    if (!res) throw new NotFoundException('Item not found');
    return { ok: true };
  }

  async list(address: string, kind?: string, page = 1, limit = 30) {
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
    kind: string,
    provider: string,
    ids: string[],
  ) {
    const rows = await this.model
      .find({ address, kind, provider, externalId: { $in: ids } })
      .select({ externalId: 1 })
      .lean();

    const set = new Set(rows.map((r) => r.externalId));
    const map: Record<string, boolean> = {};
    ids.forEach((id) => {
      map[id] = set.has(id);
    });
    return map;
  }
}
