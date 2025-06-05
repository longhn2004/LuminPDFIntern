#!/usr/bin/env ts-node

/**
 * Rollback Script: AWS S3 to Local Storage
 * 
 * This script downloads files from S3 back to local storage and updates database records.
 * Use this script to rollback the S3 migration if needed.
 * 
 * Usage: npm run rollback:s3 [--dry-run] [--batch-size=10] [--backup]
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { S3Service } from '../src/file/s3.service';
import { Model, Document } from 'mongoose';
import { File } from '../src/file/schemas/file.schema';
import { writeFileSync, createWriteStream, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { ConfigService } from '@nestjs/config';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

interface RollbackOptions {
  dryRun: boolean;
  batchSize: number;
  backup: boolean;
  startFrom?: string;
}

interface RollbackResult {
  totalFiles: number;
  downloaded: number;
  failed: number;
  skipped: number;
  errors: Array<{ fileId: string; fileName: string; error: string }>;
}

type FileDocument = File & Document;

class S3RollbackService {
  constructor(
    private fileModel: Model<FileDocument>,
    private s3Service: S3Service,
    private configService: ConfigService,
  ) {}

  async rollback(options: RollbackOptions): Promise<RollbackResult> {
    console.log('🔄 Starting S3 Rollback...\n');
    console.log('📋 Rollback Options:');
    console.log(`   Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
    console.log(`   Batch Size: ${options.batchSize}`);
    console.log(`   Create Backup: ${options.backup ? 'Yes' : 'No'}`);
    if (options.startFrom) {
      console.log(`   Start From File ID: ${options.startFrom}`);
    }
    console.log('');

    const result: RollbackResult = {
      totalFiles: 0,
      downloaded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Create backup if requested
      if (options.backup && !options.dryRun) {
        await this.createBackup();
      }

      // Ensure uploads directory exists
      const uploadPath = this.configService.get<string>('FILE_UPLOAD_PATH') || './uploads';
      if (!existsSync(uploadPath) && !options.dryRun) {
        mkdirSync(uploadPath, { recursive: true });
        console.log(`📁 Created uploads directory: ${uploadPath}`);
      }

      // Get all files with S3 keys from database
      const query = options.startFrom 
        ? { _id: { $gte: options.startFrom } }
        : {};
      
      const files = await this.fileModel.find(query).sort({ _id: 1 }).exec();
      
      // Filter files that are on S3
      const s3Files = files.filter(file => this.isS3Key(file.path));
      result.totalFiles = s3Files.length;

      console.log(`📊 Found ${files.length} total files, ${result.totalFiles} are on S3\n`);

      if (result.totalFiles === 0) {
        console.log('✅ No S3 files to rollback');
        return result;
      }

      // Process files in batches
      for (let i = 0; i < s3Files.length; i += options.batchSize) {
        const batch = s3Files.slice(i, i + options.batchSize);
        console.log(`📦 Processing batch ${Math.floor(i / options.batchSize) + 1}/${Math.ceil(s3Files.length / options.batchSize)} (${batch.length} files)`);

        for (const file of batch) {
          try {
            const rollbackResult = await this.rollbackFile(file, uploadPath, options.dryRun);
            
            if (rollbackResult === 'downloaded') {
              result.downloaded++;
              console.log(`✅ Downloaded: ${file.name} (${(file as any)._id})`);
            } else if (rollbackResult === 'skipped') {
              result.skipped++;
              console.log(`⏭️  Skipped: ${file.name} (${(file as any)._id}) - Not on S3 or already local`);
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

        // Small delay between batches
        if (i + options.batchSize < s3Files.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Summary
      console.log('\n🎉 Rollback completed!');
      console.log('📊 Summary:');
      console.log(`   Total S3 Files: ${result.totalFiles}`);
      console.log(`   Downloaded: ${result.downloaded}`);
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
        
        const reportPath = join(__dirname, '..', `rollback-errors-${Date.now()}.json`);
        writeFileSync(reportPath, JSON.stringify(errorReport, null, 2));
        console.log(`\n📄 Error report saved to: ${reportPath}`);
      }

      return result;

    } catch (error) {
      console.error('💥 Rollback failed with critical error:', error);
      throw error;
    }
  }

  private async rollbackFile(file: FileDocument, uploadPath: string, dryRun: boolean): Promise<'downloaded' | 'skipped'> {
    // Check if file path is an S3 key
    if (!this.isS3Key(file.path)) {
      return 'skipped';
    }

    // Generate local file path
    const fileName = `${Date.now()}-${file.name}`;
    const localPath = join(uploadPath, fileName);

    if (dryRun) {
      console.log(`🔍 [DRY RUN] Would download: ${file.name} from S3 key ${file.path} to ${localPath}`);
      return 'downloaded';
    }

    try {
      // Download file from S3
      const s3Object = await this.s3Service.getFileObject(file.path);
      
      if (!s3Object.Body) {
        throw new Error('S3 object has no body');
      }

      // Create local file
      const writeStream = createWriteStream(localPath);
      
      // Pipeline the S3 stream to local file
      await pipelineAsync(s3Object.Body as any, writeStream);

      // Update database with local path
      await this.fileModel.findByIdAndUpdate((file as any)._id, { path: localPath }).exec();

      console.log(`📥 Downloaded: ${file.name} -> ${localPath}`);
      return 'downloaded';

    } catch (error) {
      throw new Error(`Failed to download file from S3: ${error.message}`);
    }
  }

  private isS3Key(path: string): boolean {
    // S3 keys typically don't have file system path separators and often start with a folder structure
    return path.includes('pdfs/') && !path.includes('\\') && !path.startsWith('./') && !path.startsWith('/');
  }

  private async createBackup(): Promise<void> {
    console.log('💾 Creating database backup before rollback...');
    
    const backupData = {
      timestamp: new Date().toISOString(),
      files: await this.fileModel.find({}).exec(),
    };

    const backupPath = join(__dirname, '..', `backup-before-s3-rollback-${Date.now()}.json`);
    writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Backup created: ${backupPath}\n`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log('🔄 S3 Rollback Tool');
    console.log('==================\n');
    console.log('Usage: npm run rollback:s3 [options]\n');
    console.log('Options:');
    console.log('  --dry-run           Show what would be done without making changes');
    console.log('  --batch-size=N      Process N files at a time (default: 10)');
    console.log('  --backup            Create database backup before rollback');
    console.log('  --start-from=ID     Start rollback from specific file ID');
    console.log('  --help              Show this help message\n');
    console.log('Examples:');
    console.log('  npm run rollback:s3 --dry-run          # Preview rollback');
    console.log('  npm run rollback:s3 --backup           # Rollback with backup');
    console.log('  npm run rollback:s3 --batch-size=5     # Smaller batches');
    return;
  }

  const options: RollbackOptions = {
    dryRun: args.includes('--dry-run'),
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '10'),
    backup: args.includes('--backup'),
    startFrom: args.find(arg => arg.startsWith('--start-from='))?.split('=')[1],
  };

  console.log('🔄 S3 Rollback Tool');
  console.log('==================\n');

  try {
    // Initialize NestJS application
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // Get services
    const fileModel = app.get('FileModel') as Model<FileDocument>;
    const s3Service = app.get(S3Service);
    const configService = app.get(ConfigService);

    // Create rollback service
    const rollbackService = new S3RollbackService(fileModel, s3Service, configService);

    // Run rollback
    const result = await rollbackService.rollback(options);

    // Close application
    await app.close();

    console.log('\n✨ Rollback process completed successfully!');
    
    if (options.dryRun) {
      console.log('\n💡 This was a dry run. To perform the actual rollback, run:');
      console.log('   npm run rollback:s3 --backup');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n💥 Rollback failed:', error.message);
    console.error('\nFor help, run: npm run rollback:s3 --help');
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Rollback interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Rollback terminated');
  process.exit(1);
});

// Run rollback
if (require.main === module) {
  main();
} 