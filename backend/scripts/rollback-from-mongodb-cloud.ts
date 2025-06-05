#!/usr/bin/env ts-node

/**
 * Rollback Script: MongoDB Atlas to Local MongoDB
 * 
 * This script restores data from MongoDB Atlas back to local MongoDB.
 * Use this script to rollback the cloud migration if needed.
 * 
 * Usage: npm run rollback:mongodb [--dry-run] [--backup] [--batch-size=1000]
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Db } from 'mongodb';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const exec = promisify(require('child_process').exec);

interface RollbackOptions {
  dryRun: boolean;
  backup: boolean;
  batchSize: number;
  collections?: string[];
  skipIndexes?: boolean;
  dropExisting?: boolean;
}

interface RollbackResult {
  totalCollections: number;
  restored: number;
  failed: number;
  skipped: number;
  totalDocuments: number;
  restoredDocuments: number;
  errors: Array<{ collection: string; error: string }>;
  collections: Array<{
    name: string;
    status: 'restored' | 'failed' | 'skipped';
    documentCount: number;
    indexCount: number;
    error?: string;
  }>;
}

class MongoCloudRollbackService {
  private localClient: MongoClient;
  private cloudClient: MongoClient;
  private localDb: Db;
  private cloudDb: Db;

  constructor(
    private configService: ConfigService,
    private localUri: string,
    private cloudUri: string,
    private databaseName: string
  ) {}

  async connect(): Promise<void> {
    console.log('🔌 Connecting to databases...');
    
    try {
      // Connect to local MongoDB
      this.localClient = new MongoClient(this.localUri);
      await this.localClient.connect();
      this.localDb = this.localClient.db(this.databaseName);
      console.log('✅ Connected to local MongoDB');
      
      // Connect to cloud MongoDB
      this.cloudClient = new MongoClient(this.cloudUri);
      await this.cloudClient.connect();
      this.cloudDb = this.cloudClient.db(this.databaseName);
      console.log('✅ Connected to MongoDB Atlas');
      
      // Test connections
      await this.localDb.admin().ping();
      await this.cloudDb.admin().ping();
      console.log('🏓 Database connections verified\n');
      
    } catch (error) {
      throw new Error(`Failed to connect to databases: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from databases...');
    
    if (this.localClient) {
      await this.localClient.close();
      console.log('✅ Disconnected from local MongoDB');
    }
    
    if (this.cloudClient) {
      await this.cloudClient.close();
      console.log('✅ Disconnected from MongoDB Atlas');
    }
  }

  async rollback(options: RollbackOptions): Promise<RollbackResult> {
    console.log('🔄 Starting MongoDB Cloud Rollback...\n');
    console.log('📋 Rollback Options:');
    console.log(`   Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
    console.log(`   Create Backup: ${options.backup ? 'Yes' : 'No'}`);
    console.log(`   Batch Size: ${options.batchSize}`);
    console.log(`   Skip Indexes: ${options.skipIndexes ? 'Yes' : 'No'}`);
    console.log(`   Drop Existing: ${options.dropExisting ? 'Yes' : 'No'}`);
    if (options.collections?.length) {
      console.log(`   Collections: ${options.collections.join(', ')}`);
    }
    console.log('');

    const result: RollbackResult = {
      totalCollections: 0,
      restored: 0,
      failed: 0,
      skipped: 0,
      totalDocuments: 0,
      restoredDocuments: 0,
      errors: [],
      collections: [],
    };

    try {
      await this.connect();

      // Create backup if requested
      if (options.backup && !options.dryRun) {
        await this.createBackup();
      }

      // Get list of collections to rollback
      const collectionsToRestore = options.collections || await this.getCloudCollectionList();
      result.totalCollections = collectionsToRestore.length;

      console.log(`📊 Found ${result.totalCollections} collections to restore:`);
      collectionsToRestore.forEach(name => console.log(`   - ${name}`));
      console.log('');

      if (result.totalCollections === 0) {
        console.log('✅ No collections to restore');
        return result;
      }

      // Restore each collection
      for (const collectionName of collectionsToRestore) {
        try {
          console.log(`📦 Processing collection: ${collectionName}`);
          
          const collectionResult = await this.restoreCollection(
            collectionName, 
            options.batchSize, 
            options.dryRun,
            !options.skipIndexes,
            options.dropExisting
          );
          
          result.collections.push(collectionResult);
          result.totalDocuments += collectionResult.documentCount;
          
          if (collectionResult.status === 'restored') {
            result.restored++;
            result.restoredDocuments += collectionResult.documentCount;
            console.log(`✅ Restored: ${collectionName} (${collectionResult.documentCount} documents, ${collectionResult.indexCount} indexes)`);
          } else if (collectionResult.status === 'skipped') {
            result.skipped++;
            console.log(`⏭️  Skipped: ${collectionName} - ${collectionResult.error || 'Empty collection'}`);
          }
          
        } catch (error) {
          result.failed++;
          result.errors.push({
            collection: collectionName,
            error: error.message,
          });
          
          result.collections.push({
            name: collectionName,
            status: 'failed',
            documentCount: 0,
            indexCount: 0,
            error: error.message,
          });
          
          console.log(`❌ Failed: ${collectionName} - ${error.message}`);
        }
      }

      // Summary
      console.log('\n🎉 Rollback completed!');
      console.log('📊 Summary:');
      console.log(`   Total Collections: ${result.totalCollections}`);
      console.log(`   Restored: ${result.restored}`);
      console.log(`   Skipped: ${result.skipped}`);
      console.log(`   Failed: ${result.failed}`);
      console.log(`   Total Documents: ${result.totalDocuments}`);
      console.log(`   Restored Documents: ${result.restoredDocuments}`);

      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach(error => {
          console.log(`   ${error.collection}: ${error.error}`);
        });

        // Save error report
        const errorReport = {
          timestamp: new Date().toISOString(),
          options,
          result,
          errors: result.errors,
        };
        
        const reportPath = join(__dirname, '..', `mongodb-rollback-errors-${Date.now()}.json`);
        writeFileSync(reportPath, JSON.stringify(errorReport, null, 2));
        console.log(`\n📄 Error report saved to: ${reportPath}`);
      }

      return result;

    } finally {
      await this.disconnect();
    }
  }

  private async getCloudCollectionList(): Promise<string[]> {
    const collections = await this.cloudDb.listCollections().toArray();
    return collections.map(col => col.name);
  }

  private async restoreCollection(
    collectionName: string, 
    batchSize: number, 
    dryRun: boolean,
    restoreIndexes: boolean = true,
    dropExisting: boolean = false
  ): Promise<{
    name: string;
    status: 'restored' | 'failed' | 'skipped';
    documentCount: number;
    indexCount: number;
    error?: string;
  }> {
    const cloudCollection = this.cloudDb.collection(collectionName);
    const localCollection = this.localDb.collection(collectionName);

    // Get document count from cloud
    const documentCount = await cloudCollection.countDocuments();
    
    if (documentCount === 0) {
      return {
        name: collectionName,
        status: 'skipped',
        documentCount: 0,
        indexCount: 0,
        error: 'Empty collection in cloud',
      };
    }

    if (dryRun) {
      console.log(`🔍 [DRY RUN] Would restore ${documentCount} documents to ${collectionName}`);
      
      // Get indexes for dry run info
      const indexes = await cloudCollection.listIndexes().toArray();
      
      return {
        name: collectionName,
        status: 'restored',
        documentCount,
        indexCount: indexes.length,
      };
    }

    try {
      // Check if local collection already exists and has data
      const localDocumentCount = await localCollection.countDocuments();
      
      if (localDocumentCount > 0 && !dropExisting) {
        console.log(`⚠️  Local collection ${collectionName} already has ${localDocumentCount} documents. Use --drop-existing to overwrite.`);
        return {
          name: collectionName,
          status: 'skipped',
          documentCount,
          indexCount: 0,
          error: 'Collection already exists locally with data',
        };
      }

      // Drop existing collection if requested
      if (dropExisting && localDocumentCount > 0) {
        await localCollection.drop();
        console.log(`   🗑️  Dropped existing local collection ${collectionName}`);
      }

      // Restore documents in batches
      let restoredCount = 0;
      const cursor = cloudCollection.find({});
      
      while (await cursor.hasNext()) {
        const batch: any[] = [];
        
        // Build batch
        for (let i = 0; i < batchSize && await cursor.hasNext(); i++) {
          const doc = await cursor.next();
          if (doc) {
            batch.push(doc);
          }
        }
        
        if (batch.length > 0) {
          // Insert batch to local
          await localCollection.insertMany(batch, { ordered: false });
          restoredCount += batch.length;
          
          console.log(`   📥 Restored ${restoredCount}/${documentCount} documents (${Math.round(restoredCount / documentCount * 100)}%)`);
        }
      }

      // Restore indexes
      let indexCount = 0;
      if (restoreIndexes) {
        const indexes = await cloudCollection.listIndexes().toArray();
        
        for (const index of indexes) {
          // Skip the default _id index
          if (index.name === '_id_') continue;
          
          try {
            const indexSpec = { ...index };
            delete indexSpec.v; // Remove version field
            delete indexSpec.ns; // Remove namespace field
            
            await localCollection.createIndex(indexSpec.key, {
              name: indexSpec.name,
              ...indexSpec,
            });
            indexCount++;
          } catch (indexError) {
            console.log(`   ⚠️  Failed to create index ${index.name}: ${indexError.message}`);
          }
        }
        
        if (indexCount > 0) {
          console.log(`   📇 Created ${indexCount} indexes`);
        }
      }

      return {
        name: collectionName,
        status: 'restored',
        documentCount: restoredCount,
        indexCount,
      };

    } catch (error) {
      throw new Error(`Failed to restore collection ${collectionName}: ${error.message}`);
    }
  }

  private async createBackup(): Promise<void> {
    console.log('💾 Creating local database backup before rollback...');
    
    const backupDir = join(__dirname, '..', 'backups');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `mongodb-rollback-backup-${timestamp}`);
    
    try {
      // Use mongodump for complete backup of local database
      const mongodumpCmd = `mongodump --uri="${this.localUri}" --out="${backupPath}"`;
      console.log(`📤 Running: ${mongodumpCmd}`);
      
      const { stdout, stderr } = await exec(mongodumpCmd);
      
      if (stderr && !stderr.includes('done dumping')) {
        console.log(`⚠️  Backup warnings: ${stderr}`);
      }
      
      console.log(`✅ Backup created: ${backupPath}\n`);
      
    } catch (error) {
      console.log(`⚠️  Backup failed: ${error.message}`);
      console.log('Continuing with rollback...\n');
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log('🔄 MongoDB Cloud Rollback Tool');
    console.log('==============================\n');
    console.log('Usage: npm run rollback:mongodb [options]\n');
    console.log('Options:');
    console.log('  --dry-run              Show what would be done without making changes');
    console.log('  --backup               Create database backup before rollback');
    console.log('  --batch-size=N         Process N documents at a time (default: 1000)');
    console.log('  --collections=a,b,c    Restore only specified collections');
    console.log('  --skip-indexes         Skip index restoration');
    console.log('  --drop-existing        Drop existing local collections before restore');
    console.log('  --help                 Show this help message\n');
    console.log('Examples:');
    console.log('  npm run rollback:mongodb --dry-run         # Preview rollback');
    console.log('  npm run rollback:mongodb --backup          # Rollback with backup');
    console.log('  npm run rollback:mongodb --drop-existing   # Overwrite existing data');
    console.log('  npm run rollback:mongodb --collections=users,files # Specific collections');
    return;
  }

  const options: RollbackOptions = {
    dryRun: args.includes('--dry-run'),
    backup: args.includes('--backup'),
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '1000'),
    collections: args.find(arg => arg.startsWith('--collections='))?.split('=')[1]?.split(','),
    skipIndexes: args.includes('--skip-indexes'),
    dropExisting: args.includes('--drop-existing'),
  };

  console.log('🔄 MongoDB Cloud Rollback Tool');
  console.log('==============================\n');

  try {
    // Initialize NestJS application to get configuration
    const app = await NestFactory.createApplicationContext(AppModule);
    const configService = app.get(ConfigService);

    // Get connection strings
    const localUri = configService.get<string>('MONGO_URI') || 'mongodb://localhost:27017/luminpdf';
    const cloudUri = configService.get<string>('MONGO_CLOUD_URI');
    
    if (!cloudUri) {
      throw new Error('MONGO_CLOUD_URI environment variable is required for rollback');
    }
    
    // Extract database name from URI
    const databaseName = localUri.split('/').pop()?.split('?')[0] || 'luminpdf';
    
    console.log(`📍 Local URI: ${localUri.replace(/\/\/.*@/, '//***:***@')}`);
    console.log(`☁️  Cloud URI: ${cloudUri.replace(/\/\/.*@/, '//***:***@')}`);
    console.log(`🗂️  Database: ${databaseName}\n`);

    // Create rollback service
    const rollbackService = new MongoCloudRollbackService(
      configService,
      localUri,
      cloudUri,
      databaseName
    );

    // Run rollback
    const result = await rollbackService.rollback(options);

    // Close application
    await app.close();

    console.log('\n✨ Rollback process completed successfully!');
    
    if (options.dryRun) {
      console.log('\n💡 This was a dry run. To perform the actual rollback, run:');
      console.log('   npm run rollback:mongodb --backup');
    } else {
      console.log('\n🔄 Next steps:');
      console.log('   1. Verify local database integrity');
      console.log('   2. Update .env to use local MONGO_URI');
      console.log('   3. Restart the application');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n💥 Rollback failed:', error.message);
    console.error('\nFor help, run: npm run rollback:mongodb --help');
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