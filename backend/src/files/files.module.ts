import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from '../database/entities/file.entity';
import { FileAccess } from '../database/entities/file-access.entity';
import { User } from '../database/entities/user.entity'; // Import User if needed for owner association

@Module({
  imports: [TypeOrmModule.forFeature([File, FileAccess, User])], // Added User here as well
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {} 