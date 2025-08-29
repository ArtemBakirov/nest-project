import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SongsService } from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';
import { SearchSongsDto } from './dto/search-song.dto';

@ApiTags('songs')
@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Post()
  @ApiOperation({
    summary:
      'Create song metadata (call after successful upload to Lighthouse)',
  })
  @ApiResponse({ status: 201, description: 'Song metadata saved' })
  async create(@Body() dto: CreateSongDto) {
    return this.songsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get song by DB id' })
  @ApiParam({ name: 'id', description: 'Mongo id' })
  async getById(@Param('id') id: string) {
    const item = await this.songsService.findById(id);
    if (!item) throw new NotFoundException();
    return item;
  }

  @Get()
  @ApiOperation({ summary: 'Search songs' })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async search(@Query() q: SearchSongsDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    return this.songsService.search(q.query ?? '', page, pageSize);
  }
}
