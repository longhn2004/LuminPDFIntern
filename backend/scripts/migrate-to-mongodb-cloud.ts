#!/usr/bin/env ts-node

/**
 * Migration Script: Local MongoDB to MongoDB Atlas
 * 
 * This script migrates all data from local MongoDB to MongoDB Atlas (cloud).
 * It exports collections from local database and imports them to the cloud database.
 * 
 * Usage: npm run migrate:mongodb [--dry-run] [--backup] [--batch-size=1000]
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Db, Collection } from 'mongodb';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';

const exec = promisify(require('child_process').exec);

interface MongoMigrationOptions {
  dryRun: boolean;
  backup: boolean;
  batchSize: number;
  collections?: string[];
  skipIndexes?: boolean;
}

interface MigrationResult {
  totalCollections: number;
  migrated: number;
  failed: number;
  skipped: number;
  totalDocuments: number;
  migratedDocuments: number;
  errors: Array<{ collection: string; error: string }>;
  collections: Array<{
    name: string;
    status: 'migrated' | 'failed' | 'skipped';
    documentCount: number;
    indexCount: number;
    error?: string;
  }>;
}

class MongoCloudMigrationService {
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

  async migrate(options: MongoMigrationOptions): Promise<MigrationResult> {
    console.log('🚀 Starting MongoDB Cloud Migration...\n');
    console.log('📋 Migration Options:');
    console.log(`   Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
    console.log(`   Create Backup: ${options.backup ? 'Yes' : 'No'}`);
    console.log(`   Batch Size: ${options.batchSize}`);
    console.log(`   Skip Indexes: ${options.skipIndexes ? 'Yes' : 'No'}`);
    if (options.collections?.length) {
      console.log(`   Collections: ${options.collections.join(', ')}`);
    }
    console.log('');

    const result: MigrationResult = {
      totalCollections: 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      totalDocuments: 0,
      migratedDocuments: 0,
      errors: [],
      collections: [],
    };

    try {
      await this.connect();

      // Create backup if requested
      if (options.backup && !options.dryRun) {
        await this.createBackup();
      }

      // Get list of collections to migrate
      const collectionsToMigrate = options.collections || await this.getCollectionList();
      result.totalCollections = collectionsToMigrate.length;

      console.log(`📊 Found ${result.totalCollections} collections to migrate:`);
      collectionsToMigrate.forEach(name => console.log(`   - ${name}`));
      console.log('');

      if (result.totalCollections === 0) {
        console.log('✅ No collections to migrate');
        return result;
      }

      // Migrate each collection
      for (const collectionName of collectionsToMigrate) {
        try {
          console.log(`📦 Processing collection: ${collectionName}`);
          
          const collectionResult = await this.migrateCollection(
            collectionName, 
            options.batchSize, 
            options.dryRun,
            !options.skipIndexes
          );
          
          result.collections.push(collectionResult);
          result.totalDocuments += collectionResult.documentCount;
          
          if (collectionResult.status === 'migrated') {
            result.migrated++;
            result.migratedDocuments += collectionResult.documentCount;
            console.log(`✅ Migrated: ${collectionName} (${collectionResult.documentCount} documents, ${collectionResult.indexCount} indexes)`);
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
      console.log('\n🎉 Migration completed!');
      console.log('📊 Summary:');
      console.log(`   Total Collections: ${result.totalCollections}`);
      console.log(`   Migrated: ${result.migrated}`);
      console.log(`   Skipped: ${result.skipped}`);
      console.log(`   Failed: ${result.failed}`);
      console.log(`   Total Documents: ${result.totalDocuments}`);
      console.log(`   Migrated Documents: ${result.migratedDocuments}`);

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
        
        const reportPath = join(__dirname, '..', `mongodb-migration-errors-${Date.now()}.json`);
        writeFileSync(reportPath, JSON.stringify(errorReport, null, 2));
        console.log(`\n📄 Error report saved to: ${reportPath}`);
      }

      return result;

    } finally {
      await this.disconnect();
    }
  }

  private async getCollectionList(): Promise<string[]> {
    const collections = await this.localDb.listCollections().toArray();
    return collections.map(col => col.name);
  }

  private async migrateCollection(
    collectionName: string, 
    batchSize: number, 
    dryRun: boolean,
    migrateIndexes: boolean = true
  ): Promise<{
    name: string;
    status: 'migrated' | 'failed' | 'skipped';
    documentCount: number;
    indexCount: number;
    error?: string;
  }> {
    const localCollection = this.localDb.collection(collectionName);
    const cloudCollection = this.cloudDb.collection(collectionName);

    // Get document count
    const documentCount = await localCollection.countDocuments();
    
    if (documentCount === 0) {
      return {
        name: collectionName,
        status: 'skipped',
        documentCount: 0,
        indexCount: 0,
        error: 'Empty collection',
      };
    }

    if (dryRun) {
      console.log(`🔍 [DRY RUN] Would migrate ${documentCount} documents from ${collectionName}`);
      
      // Get indexes for dry run info
      const indexes = await localCollection.listIndexes().toArray();
      
      return {
        name: collectionName,
        status: 'migrated',
        documentCount,
        indexCount: indexes.length,
      };
    }

    try {
      // Check if cloud collection already exists and has data
      const cloudDocumentCount = await cloudCollection.countDocuments();
      if (cloudDocumentCount > 0) {
        console.log(`⚠️  Cloud collection ${collectionName} already has ${cloudDocumentCount} documents. Skipping...`);
        return {
          name: collectionName,
          status: 'skipped',
          documentCount,
          indexCount: 0,
          error: 'Collection already exists in cloud with data',
        };
      }

      // Migrate documents in batches
      let migratedCount = 0;
      const cursor = localCollection.find({});
      
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
          // Insert batch to cloud
          await cloudCollection.insertMany(batch, { ordered: false });
          migratedCount += batch.length;
          
          console.log(`   📤 Migrated ${migratedCount}/${documentCount} documents (${Math.round(migratedCount / documentCount * 100)}%)`);
        }
      }

      // Migrate indexes
      let indexCount = 0;
      if (migrateIndexes) {
        const indexes = await localCollection.listIndexes().toArray();
        
        for (const index of indexes) {
          // Skip the default _id index
          if (index.name === '_id_') continue;
          
          try {
            const indexSpec = { ...index };
            delete indexSpec.v; // Remove version field
            delete indexSpec.ns; // Remove namespace field
            
            await cloudCollection.createIndex(indexSpec.key, {
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
        status: 'migrated',
        documentCount: migratedCount,
        indexCount,
      };

    } catch (error) {
      throw new Error(`Failed to migrate collection ${collectionName}: ${error.message}`);
    }
  }

  private async createBackup(): Promise<void> {
    console.log('💾 Creating local database backup...');
    
    const backupDir = join(__dirname, '..', 'backups');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `mongodb-backup-${timestamp}`);
    
    try {
      // Use mongodump for complete backup
      const mongodumpCmd = `mongodump --uri="${this.localUri}" --out="${backupPath}"`;
      console.log(`📤 Running: ${mongodumpCmd}`);
      
      const { stdout, stderr } = await exec(mongodumpCmd);
      
      if (stderr && !stderr.includes('done dumping')) {
        console.log(`⚠️  Backup warnings: ${stderr}`);
      }
      
      console.log(`✅ Backup created: ${backupPath}\n`);
      
      // Also create JSON backup of critical data
      await this.createJSONBackup(backupPath);
      
    } catch (error) {
      console.log(`⚠️  Backup failed: ${error.message}`);
      console.log('Continuing with migration...\n');
    }
  }

  private async createJSONBackup(backupPath: string): Promise<void> {
    try {
      const collections = await this.getCollectionList();
      const backupData: any = {
        timestamp: new Date().toISOString(),
        database: this.databaseName,
        collections: {},
      };
      
      for (const collectionName of collections) {
        const collection = this.localDb.collection(collectionName);
        const documents = await collection.find({}).toArray();
        const indexes = await collection.listIndexes().toArray();
        
        backupData.collections[collectionName] = {
          documents,
          indexes,
          count: documents.length,
        };
      }
      
      const jsonBackupPath = join(backupPath, 'backup-data.json');
      writeFileSync(jsonBackupPath, JSON.stringify(backupData, null, 2));
      console.log(`📄 JSON backup created: ${jsonBackupPath}`);
      
    } catch (error) {
      console.log(`⚠️  JSON backup failed: ${error.message}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log('🚀 MongoDB Cloud Migration Tool');
    console.log('==============================\n');
    console.log('Usage: npm run migrate:mongodb [options]\n');
    console.log('Options:');
    console.log('  --dry-run              Show what would be done without making changes');
    console.log('  --backup               Create database backup before migration');
    console.log('  --batch-size=N         Process N documents at a time (default: 1000)');
    console.log('  --collections=a,b,c    Migrate only specified collections');
    console.log('  --skip-indexes         Skip index migration');
    console.log('  --help                 Show this help message\n');
    console.log('Examples:');
    console.log('  npm run migrate:mongodb --dry-run        # Preview migration');
    console.log('  npm run migrate:mongodb --backup         # Migrate with backup');
    console.log('  npm run migrate:mongodb --batch-size=500 # Smaller batches');
    console.log('  npm run migrate:mongodb --collections=users,files # Specific collections');
    return;
  }

  const options: MongoMigrationOptions = {
    dryRun: args.includes('--dry-run'),
    backup: args.includes('--backup'),
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '1000'),
    collections: args.find(arg => arg.startsWith('--collections='))?.split('=')[1]?.split(','),
    skipIndexes: args.includes('--skip-indexes'),
  };

  console.log('🚀 MongoDB Cloud Migration Tool');
  console.log('==============================\n');

  try {
    // Initialize NestJS application to get configuration
    const app = await NestFactory.createApplicationContext(AppModule);
    const configService = app.get(ConfigService);

    // Get connection strings
    const localUri = configService.get<string>('MONGO_URI') || 'mongodb://localhost:27017/luminpdf';
    const cloudUri = configService.get<string>('MONGO_CLOUD_URI');
    
    if (!cloudUri) {
      throw new Error('MONGO_CLOUD_URI environment variable is required for cloud migration');
    }
    
    // Extract database name from URI
    const databaseName = localUri.split('/').pop()?.split('?')[0] || 'luminpdf';
    
    console.log(`📍 Local URI: ${localUri.replace(/\/\/.*@/, '//***:***@')}`);
    console.log(`☁️  Cloud URI: ${cloudUri.replace(/\/\/.*@/, '//***:***@')}`);
    console.log(`🗂️  Database: ${databaseName}\n`);

    // Create migration service
    const migrationService = new MongoCloudMigrationService(
      configService,
      localUri,
      cloudUri,
      databaseName
    );

    // Run migration
    const result = await migrationService.migrate(options);

    // Close application
    await app.close();

    console.log('\n✨ Migration process completed successfully!');
    
    if (options.dryRun) {
      console.log('\n💡 This was a dry run. To perform the actual migration, run:');
      console.log('   npm run migrate:mongodb --backup');
    } else {
      console.log('\n🔄 Next steps:');
      console.log('   1. Update your .env file to use MONGO_CLOUD_URI');
      console.log('   2. Test the application with cloud database');
      console.log('   3. Update production environment variables');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    console.error('\nFor help, run: npm run migrate:mongodb --help');
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