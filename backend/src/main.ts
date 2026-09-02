import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { resolveCorsOrigin } from './config/cors.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: resolveCorsOrigin() });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
