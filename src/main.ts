import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { closeAppOnShutDown } from './helpers/closeAppOnShutDown';

// main.ts
import { webcrypto } from 'crypto';
if (!global.crypto) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  global.crypto = webcrypto as any;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  closeAppOnShutDown(app);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('alpaca-musica')
    .setDescription('music api with decentralized storage')
    .setVersion('1.0')
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc);

  await app.listen(8080);
  console.log('API http://localhost:8080 |  Swagger: /docs');
}
bootstrap();
