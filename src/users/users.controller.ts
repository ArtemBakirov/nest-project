import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserDto } from './dto/user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  getTest() {
    return 'test';
  }

  @Get(':address')
  @ApiOperation({ summary: 'Get a user by address (public key)' })
  @ApiParam({ name: 'address' })
  async getUser(@Param('address') address: string) {
    return this.users.getByAddress(address);
  }

  @Post()
  @ApiOperation({
    summary: 'Create or update a user profile (multipart: optional avatarFile)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        username: { type: 'string' },
        bio: { type: 'string' },
        avatarFile: { type: 'string', format: 'binary' },
      },
      required: ['address', 'username'],
    },
  })
  @UseInterceptors(
    FileInterceptor('avatarFile', {
      storage: memoryStorage(), // keep in memory for sharp
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async saveUser(
    @Body() dto: UserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.users.upsert(dto, file);
  }

  @Get(':address/avatar')
  @ApiOperation({ summary: 'Stream avatar image from GridFS' })
  @ApiParam({ name: 'address' })
  async streamAvatar(@Param('address') address: string, @Res() res: any) {
    return this.users.streamAvatar(address, res); // service writes to res
  }

  @Delete(':address')
  @ApiOperation({ summary: 'Delete user profile (and avatar if present)' })
  @ApiParam({ name: 'address' })
  async deleteUser(@Param('address') address: string) {
    return this.users.deleteByAddress(address);
  }
}
