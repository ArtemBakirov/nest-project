import { Module } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { GridFSBucket } from 'mongodb';
import { Connection } from 'mongoose';
import { AVATAR_BUCKET } from './users.tokens';

// export const AVATAR_BUCKET = 'AVATAR_BUCKET';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: AVATAR_BUCKET,
      inject: [getConnectionToken()], // ✅ tell Nest to inject the Mongoose connection
      useFactory: (conn: Connection) => {
        // Reuse the same DB connection for GridFS
        return new GridFSBucket(conn.db!, { bucketName: 'avatars' });
      },
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
