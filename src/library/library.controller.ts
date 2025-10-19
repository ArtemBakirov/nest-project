// src/library/library.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { LibraryService } from './library.service';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';

@Controller('library')
export class LibraryController {
  constructor(private readonly service: LibraryService) {}

  @Post()
  async add(@Req() req: any, @Body() dto: CreateLibraryItemDto) {
    console.log('add2');
    // const userId = new Types.ObjectId(req.user.id);
    return this.service.add(dto);
  }

  @Delete()
  async remove(
    @Req() req: any,
    @Query('kind') kind: 'track' | 'album' | 'artist',
    @Query('provider') provider: 'youtube' | 'jamendo',
    @Query('externalId') externalId: string,
    @Query('address') address: string,
  ) {
    // const userId = new Types.ObjectId(req.user.id);
    return this.service.remove(address, kind, provider, externalId);
  }

  @Get()
  async list(
    @Req() req: any,
    @Query('address') address: string,
    @Query('kind') kind?: 'track' | 'album' | 'artist',
    @Query('page') page = '1',
    @Query('limit') limit = '30',
  ) {
    // const userId = new Types.ObjectId(req.user.id);
    return this.service.list(address, kind, Number(page), Number(limit));
  }

  @Post('is-saved')
  async isSaved(
    @Req() req: any,
    @Body()
    body: {
      kind: 'track' | 'album' | 'artist';
      provider: 'youtube';
      ids: string[];
      address: string;
    },
  ) {
    //const userId = new Types.ObjectId(req.user.id);
    return this.service.isSavedBatch(
      body.address,
      body.kind,
      body.provider,
      body.ids,
    );
  }
}
