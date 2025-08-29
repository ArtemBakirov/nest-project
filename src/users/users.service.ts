import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Readable } from 'stream';
import sharp from 'sharp';
import { GridFSBucket, ObjectId } from 'mongodb';
import { User, UserDocument } from './schemas/user.schema';
import { UserDto } from './dto/user.dto';
import { AVATAR_BUCKET } from './users.tokens';
import { Response } from 'express';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @Inject(AVATAR_BUCKET) private readonly avatarBucket: GridFSBucket,
  ) {}

  async getByAddress(address: string) {
    const user = await this.userModel.findOne({ address }).lean().exec();
    console.log('user', user);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async upsert(dto: UserDto, avatarFile?: Express.Multer.File) {
    let newAvatarId: ObjectId | undefined;

    if (avatarFile) {
      const ok = ['image/jpeg', 'image/png', 'image/webp'];
      if (!ok.includes(avatarFile.mimetype)) {
        throw new BadRequestException('Unsupported image type');
      }

      // Process: rotate, center-crop to 512x512, convert to webp q=82
      const processed = await sharp(avatarFile.buffer)
        .rotate()
        .resize(512, 512, { fit: 'cover' })
        .webp({ quality: 82 })
        .toBuffer();

      // Upload to GridFS
      const filename = `${sanitize(dto.address)}-${Date.now()}.webp`;
      const uploadStream = this.avatarBucket.openUploadStream(filename, {
        contentType: 'image/webp',
        metadata: { address: dto.address },
      });

      await new Promise<void>((resolve, reject) => {
        Readable.from(processed)
          .pipe(uploadStream)
          .on('finish', () => resolve())
          .on('error', reject);
      });

      newAvatarId = uploadStream.id;
    }

    // Fetch old avatar id to delete later if replaced
    const existing = await this.userModel
      .findOne({ address: dto.address })
      .lean()
      .exec();
    const oldAvatarId = existing?.avatar as ObjectId | undefined;

    const updated = await this.userModel
      .findOneAndUpdate(
        { address: dto.address },
        {
          username: dto.username,
          bio: dto.bio || undefined,
          ...(newAvatarId ? { avatar: new Types.ObjectId(newAvatarId) } : {}),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean()
      .exec();

    // If we uploaded a new one — delete old
    if (
      newAvatarId &&
      oldAvatarId &&
      oldAvatarId.toString() !== String(newAvatarId)
    ) {
      try {
        await this.avatarBucket.delete(oldAvatarId);
      } catch {
        /* ignore if missing */
      }
    }

    return updated;
  }

  async streamAvatar(address: string, res: Response) {
    const user = await this.userModel
      .findOne({ address }, { avatar: 1, updatedAt: 1 })
      .lean()
      .exec();

    if (!user?.avatar) throw new NotFoundException();

    // (Optional) read file metadata to set content-type
    let contentType = 'image/webp';
    try {
      const files = await this.avatarBucket
        .find({ _id: new ObjectId(String(user.avatar)) })
        .toArray();
      if (files[0]?.contentType) contentType = files[0].contentType!;
    } catch (e) {
      console.error(e);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // 7d

    this.avatarBucket
      .openDownloadStream(new ObjectId(String(user.avatar)))
      .on('error', () => res.status(404).end())
      .pipe(res);
  }

  async deleteByAddress(address: string) {
    const user = await this.userModel.findOne({ address }).exec();
    if (!user) throw new NotFoundException('User not found');

    // delete avatar if exists
    if (user.avatar) {
      try {
        await this.avatarBucket.delete(new ObjectId(String(user.avatar)));
      } catch {
        /* ignore */
      }
    }
    await this.userModel.deleteOne({ address }).exec();
    return { message: 'User deleted successfully' };
  }
}

function sanitize(s: string) {
  return s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'avatar';
}
