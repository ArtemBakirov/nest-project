import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { StorageModule } from './storage/storage.module';
import { SongsModule } from './songs/songs.module';
import { UsersModule } from './users/users.module';
import { LibraryModule } from './library/library.module';
import { YoutubeCacheModule } from './youtube-cache/youtube-cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        uri: cfg.get<string>('MONGODB_CONNECTION_STRING_DEV')!,
        dbName: 'quotesApp', // optional, included in URI
      }),
    }),
    StorageModule,
    SongsModule,
    UsersModule,
    LibraryModule,
    YoutubeCacheModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
