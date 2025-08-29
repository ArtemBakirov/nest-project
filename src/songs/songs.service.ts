import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Song, SongDocument } from './schemas/song.schema';
import { CreateSongDto } from './dto/create-song.dto';

@Injectable()
export class SongsService {
  constructor(
    @InjectModel(Song.name) private readonly songModel: Model<SongDocument>,
  ) {}

  async create(dto: CreateSongDto): Promise<Song> {
    const item = new this.songModel({
      ...dto,
      isEncrypted: dto.isEncrypted ?? true,
      genres: dto.genres ?? [],
      keywords: dto.keywords ?? [],
    });
    return item.save();
  }

  async findById(id: string): Promise<Song | null> {
    return this.songModel.findById(id).lean().exec();
  }

  async findByCid(cid: string): Promise<Song | null> {
    return this.songModel.findOne({ cid }).lean().exec();
  }

  async search(query = '', page = 1, pageSize = 20) {
    const skip = Math.max(0, (page - 1) * pageSize);
    const limit = Math.min(100, Math.max(1, pageSize));

    let filter: FilterQuery<SongDocument> = {};
    let sort: any = { createdAt: -1 };

    if (query && query.trim()) {
      // Use $text if index exists; fallback to regex for dev envs
      filter = { $text: { $search: query } } as FilterQuery<SongDocument>;
      sort = { score: { $meta: 'textScore' } };
    }

    const [items, total] = await Promise.all([
      this.songModel
        .find(filter, query ? { score: { $meta: 'textScore' } } : undefined)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.songModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, pageSize: limit };
  }

  // Optional logical delete later
  async remove(id: string) {
    await this.songModel.deleteOne({ _id: id }).exec();
    return { ok: true };
  }
}
