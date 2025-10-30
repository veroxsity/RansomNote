import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Compute CORS origins from FRONTEND_ORIGIN env.
  // Supports comma-separated origins. Use '*' to reflect request origin dynamically.
  const rawOrigin = process.env.FRONTEND_ORIGIN;
  const origins = rawOrigin
    ? rawOrigin === '*'
      ? true
      : rawOrigin.split(',').map((s) => s.trim()).filter(Boolean)
    : ['http://localhost:3000'];

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: origins as any,
      credentials: true,
    },
  });

  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST;
  if (host) {
    await app.listen(port, host);
  } else {
    await app.listen(port);
  }
}
bootstrap();
