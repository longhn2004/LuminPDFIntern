#!/usr/bin/env ts-node

/**
 * Migration Script: Local Storage to AWS S3
 * 
 * This script migrates existing files from local storage to AWS S3.
 * It reads files from the database, uploads them to S3, and updates the database records.
 * 
 * Usage: npm run migrate:s3 [--dry-run] [--batch-size=10] [--backup]
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { FileService } from '../src/file/file.service';
import { S3Service } from '../src/file/s3.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { File } from '../src/file/schemas/file.schema';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { ConfigService } from '@nestjs/config';

interface MigrationOptions {
  dryRun: boolean;
  batchSize: number;
  backup: boolean;
  startFrom?: string;
}

interface MigrationResult {
  totalFiles: number;
  migrated: number;
  failed: number;
  skipped: number;
  errors: Array<{ fileId: string; fileName: string; error: string }>;
}

type FileDocument = File & Document;

class S3MigrationService {
  constructor(
    private fileModel: Model<FileDocument>,
    private s3Service: S3Service,
    private configService: ConfigService,
  ) {}

  async migrate(options: MigrationOptions): Promise<MigrationResult> {
    console.log('🚀 Starting S3 Migration...\n');
    console.log('📋 Migration Options:');
    console.log(`   Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
    console.log(`   Batch Size: ${options.batchSize}`);
    console.log(`   Create Backup: ${options.backup ? 'Yes' : 'No'}`);
    if (options.startFrom) {
      console.log(`   Start From File ID: ${options.startFrom}`);
    }
    console.log('');

    const result: MigrationResult = {
      totalFiles: 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Create backup if requested
      if (options.backup && !options.dryRun) {
        await this.createBackup();
      }

      // Get all files from database
      const query = options.startFrom 
        ? { _id: { $gte: options.startFrom } }
        : {};
      
      const files = await this.fileModel.find(query).sort({ _id: 1 }).exec();
      result.totalFiles = files.length;

      console.log(`📊 Found ${result.totalFiles} files to process\n`);

      if (result.totalFiles === 0) {
        console.log('✅ No files to migrate');
        return result;
      }

      // Process files in batches
      for (let i = 0; i < files.length; i += options.batchSize) {
        const batch = files.slice(i, i + options.batchSize);
        console.log(`📦 Processing batch ${Math.floor(i / options.batchSize) + 1}/${Math.ceil(files.length / options.batchSize)} (${batch.length} files)`);

        for (const file of batch) {
          try {
            const migrationResult = await this.migrateFile(file, options.dryRun);
            
            if (migrationResult === 'migrated') {
              result.migrated++;
              console.log(`✅ Migrated: ${file.name} (${(file as any)._id})`);
            } else if (migrationResult === 'skipped') {
              result.skipped++;
              console.log(`⏭️  Skipped: ${file.name} (${(file as any)._id}) - Already on S3 or file not found`);
            }
          } catch (error) {
            result.failed++;
            result.errors.push({
              fileId: (file as any)._id.toString(),
              fileName: file.name,
              error: error.message,
            });
            console.log(`❌ Failed: ${file.name} (${(file as any)._id}) - ${error.message}`);
          }
        }

        // Small delay between batches to avoid overwhelming the system
        if (i + options.batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Summary
      console.log('\n🎉 Migration completed!');
      console.log('📊 Summary:');
      console.log(`   Total Files: ${result.totalFiles}`);
      console.log(`   Migrated: ${result.migrated}`);
      console.log(`   Skipped: ${result.skipped}`);
      console.log(`   Failed: ${result.failed}`);

      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach(error => {
          console.log(`   ${error.fileName} (${error.fileId}): ${error.error}`);
        });

        // Save error report
        const errorReport = {
          timestamp: new Date().toISOString(),
          options,
          result,
          errors: result.errors,
        };
        
        const reportPath = join(__dirname, '..', `migration-errors-${Date.now()}.json`);
        writeFileSync(reportPath, JSON.stringify(errorReport, null, 2));
        console.log(`\n📄 Error report saved to: ${reportPath}`);
      }

      return result;

    } catch (error) {
      console.error('💥 Migration failed with critical error:', error);
      throw error;
    }
  }

  private async migrateFile(file: FileDocument, dryRun: boolean): Promise<'migrated' | 'skipped'> {
    // Check if file path looks like an S3 key (already migrated)
    if (this.isS3Key(file.path)) {
      return 'skipped';
    }

    // Determine local file path
    const uploadPath = this.configService.get<string>('FILE_UPLOAD_PATH') || './uploads';
    let localPath = file.path;

    // Handle different path formats
    if (!localPath.startsWith('/') && !localPath.includes(':')) {
      // Relative path
      localPath = join(uploadPath, localPath);
    }

    // Check if local file exists
    if (!existsSync(localPath)) {
      // Try alternative paths
      const alternativePaths = [
        join(uploadPath, file.path),
        join(uploadPath, file.path.replace(/^.*[\\\/]/, '')), // Just filename
        file.path, // Original path as is
      ];

      let found = false;
      for (const altPath of alternativePaths) {
        if (existsSync(altPath)) {
          localPath = altPath;
          found = true;
          break;
        }
      }

      if (!found) {
        throw new Error(`Local file not found at any of the expected paths: ${[localPath, ...alternativePaths].join(', ')}`);
      }
    }

    if (dryRun) {
      console.log(`🔍 [DRY RUN] Would migrate: ${file.name} from ${localPath}`);
      return 'migrated';
    }

    try {
      // Read local file
      const fileBuffer = readFileSync(localPath);
      
      // Create a mock Multer file object
      const mockFile: Express.Multer.File = {
        buffer: fileBuffer,
        originalname: file.name,
        mimetype: 'application/pdf',
        fieldname: 'file',
        encoding: '7bit',
        size: fileBuffer.length,
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      // Upload to S3
      const s3Key = await this.s3Service.uploadFile(mockFile);

      // Update database with S3 key
      await this.fileModel.findByIdAndUpdate((file as any)._id, { path: s3Key }).exec();

      return 'migrated';

    } catch (error) {
      throw new Error(`Failed to migrate file: ${error.message}`);
    }
  }

  private isS3Key(path: string): boolean {
    // S3 keys typically don't have file system path separators and often start with a folder structure
    return path.includes('pdfs/') && !path.includes('\\') && !path.startsWith('./') && !path.startsWith('/');
  }

  private async createBackup(): Promise<void> {
    console.log('💾 Creating database backup...');
    
    const backupData = {
      timestamp: new Date().toISOString(),
      files: await this.fileModel.find({}).exec(),
    };

    const backupPath = join(__dirname, '..', `backup-before-s3-migration-${Date.now()}.json`);
    writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Backup created: ${backupPath}\n`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '10'),
    backup: args.includes('--backup'),
    startFrom: args.find(arg => arg.startsWith('--start-from='))?.split('=')[1],
  };

  console.log('🏁 S3 Migration Tool');
  console.log('==================\n');

  try {
    // Initialize NestJS application
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // Get services
    const fileModel = app.get('FileModel') as Model<FileDocument>;
    const s3Service = app.get(S3Service);
    const configService = app.get(ConfigService);

    // Create migration service
    const migrationService = new S3MigrationService(fileModel, s3Service, configService);

    // Run migration
    const result = await migrationService.migrate(options);

    // Close application
    await app.close();

    console.log('\n✨ Migration process completed successfully!');
    
    if (options.dryRun) {
      console.log('\n💡 This was a dry run. To perform the actual migration, run:');
      console.log('   npm run migrate:s3 --backup');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    console.error('\nFor help, see: ./MIGRATION_TO_S3.md');
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Migration interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Migration terminated');
  process.exit(1);
});

// Run migration
if (require.main === module) {
  main();
} 