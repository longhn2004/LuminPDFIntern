// Import polyfills first to fix crypto module issue
import './polyfills';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig, swaggerOptions } from './swagger.config';

async function bootstrap() {
  console.log('🚀 Starting LuminPDF Backend with Redis Cache...');
  
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 5000);

  // Log Redis configuration
  const redisUrl = configService.get<string>('REDIS_URL');
  const redisHost = configService.get<string>('REDIS_HOST');
  const redisPort = configService.get<number>('REDIS_PORT');

  const mongoCloudUri = configService.get<string>('MONGO_CLOUD_URI');
  const mongoLocalUri = configService.get<string>('MONGO_URI');
  
  if (mongoCloudUri) {
    console.log(`💾 MongoDB: Using Cloud URI ${mongoCloudUri}`);
  } else if (mongoLocalUri) {
    console.log(`💾 MongoDB: Using Local URI ${mongoLocalUri}`);
  } else {
    console.log(`💾 MongoDB: Using default localhost:27017`);
  }

  if (redisUrl) {
    console.log(`📡 Redis Cache: Using URL ${redisUrl}`);
  } else if (redisHost && redisPort) {
    console.log(`📡 Redis Cache: Using ${redisHost}:${redisPort}`);
  } else {
    console.log(`📡 Redis Cache: Using default localhost:6379`);
  }
  
  console.log(`💾 Cache TTL: ${configService.get<number>('REDIS_TTL') || 300}s`);

  app.enableCors({
    origin: configService.get('APP_URL'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.use(cookieParser());

  // Setup Swagger documentation
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document, swaggerOptions);

  console.log('📚 Swagger documentation available at: /api-docs');

  await app.listen(port);
  console.log(`🎉 Application is running on port ${port} with Redis cache enabled`);
}
bootstrap();
