import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from './app.module';
import { auth } from './auth/auth.instance';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Mount BetterAuth before NestJS routes — handles /api/auth/* wildcard
  app.use('/api/auth', toNodeHandler(auth.handler));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({
    origin: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Monieplans API running on port ${process.env.PORT ?? 3000}`);
}

bootstrap();
