import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  controllers: [StorageController],
  providers: [
    {
      provide: StorageService,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const key = cfg.get<string>('LIGHTHOUSE_API_KEY');
        const walletAddress = cfg.get<string>('LIGHTHOUSE_WALLET_ADDRESS');
        const walletPrivKey = cfg.get<string>('LIGHTHOUSE_WALLET_PRIVATE_KEY');
        if (!key && !walletPrivKey && !walletAddress) {
          throw new Error(
            'some of the environment variables are missing, check storage.module.ts',
          );
        } else {
          return new StorageService(key!, walletAddress!, walletPrivKey!);
        }
      },
    },
  ],
})
export class StorageModule {}
