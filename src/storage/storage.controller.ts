import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
  Param,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';

// for receiving files, like with multer
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { StorageService } from './storage.service';

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './tmp',
        filename: (_, file, cb) => {
          // простое имя: timestamp + исходное расширение
          cb(null, Date.now() + extname(file.originalname));
        },
      }),
      fileFilter: (_, file, cb) => {
        const ok = /audio\/(mpeg|mp4|aac|flac|ogg|wav)/.test(file.mimetype);
        cb(ok ? null : new BadRequestException('Only audio files'), ok);
      },
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB на тест
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    console.log('uploading file', file);
    return this.storage.uploadFileEncrypted(file.path, file.originalname);
  }

  @Get('decrypt/:cid')
  @ApiOperation({
    summary: 'Decrypt & stream an encrypted audio by CID',
    description:
      'Checks entitlement, fetches the Lighthouse encryption key, decrypts the ciphertext and streams audio/mpeg.',
  })
  @ApiParam({
    name: 'cid',
    required: true,
    description: 'IPFS CID of the encrypted file',
  })
  @ApiProduces('audio/mpeg')
  @ApiResponse({
    status: 200,
    description: 'Audio stream (MP3/other audio/mpeg)',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — user has no entitlement',
  })
  async decryptAndStream(@Param('cid') cid: string, @Res() res: Response) {
    // 1) Your entitlement check (PKOIN purchase, roles, etc.)
    const userIsAllowed = true; // TODO: implement your app’s logic
    if (!userIsAllowed) throw new ForbiddenException();

    // 2) Delegate to service (service writes directly to res)
    const buf = await this.storage.decryptAndStream(cid);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buf.length.toString());
    res.send(buf);
  }
}
