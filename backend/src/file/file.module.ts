import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { File, FileSchema } from './schemas/file.schema';
import { Invitation, InvitationSchema } from './schemas/invitation.schema';
import { ShareableLink, ShareableLinkSchema } from './schemas/shareable-link.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { S3Service } from './s3.service';
import { MulterModule } from '@nestjs/platform-express';
import { EmailModule } from '../email/email.module';
import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: File.name, schema: FileSchema },
      { name: Invitation.name, schema: InvitationSchema },
      { name: ShareableLink.name, schema: ShareableLinkSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MulterModule.register({
      storage: require('multer').memoryStorage(),
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF files are allowed'), false);
        }
      },
    }),
    EmailModule,
    ConfigModule,
    CacheModule,
  ],
  controllers: [FileController],
  providers: [FileService, S3Service],
  exports: [FileService, S3Service],
})
export class FileModule {}