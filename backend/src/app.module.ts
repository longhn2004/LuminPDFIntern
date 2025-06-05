import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { FileModule } from './file/file.module';
import { EmailModule } from './email/email.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_CLOUD_URI || 'mongodb://localhost:27017/luminpdf'),
    CacheModule,
    AuthModule,
    FileModule,
    EmailModule,
  ],
})
export class AppModule {}