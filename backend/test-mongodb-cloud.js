#!/usr/bin/env node

/**
 * MongoDB Atlas Connection Test Script
 * 
 * This script tests the MongoDB Atlas configuration and connectivity.
 * Run this before starting the migration to ensure cloud database is properly configured.
 * 
 * Usage: node test-mongodb-cloud.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

class MongoCloudTester {
  constructor() {
    this.localUri = process.env.MONGO_URI || 'mongodb://localhost:27017/luminpdf';
    this.cloudUri = process.env.MONGO_CLOUD_URI;
  }

  async testConnections() {
    console.log('🧪 MongoDB Atlas Connection Test');
    console.log('================================\n');

    const results = {
      local: false,
      cloud: false,
      basicOperations: false,
      indexSupport: false,
      aggregationSupport: false,
    };

    try {
      // Test local MongoDB connection
      console.log('📍 Testing local MongoDB connection...');
      results.local = await this.testLocalConnection();
      
      // Test cloud MongoDB connection
      console.log('\n☁️  Testing MongoDB Atlas connection...');
      results.cloud = await this.testCloudConnection();
      
      if (results.cloud) {
        // Test basic operations
        console.log('\n⚙️  Testing basic database operations...');
        results.basicOperations = await this.testBasicOperations();
        
        // Test index support
        console.log('\n📇 Testing index support...');
        results.indexSupport = await this.testIndexSupport();
        
        // Test aggregation support
        console.log('\n🔄 Testing aggregation support...');
        results.aggregationSupport = await this.testAggregationSupport();
      }

      // Summary
      console.log('\n📊 Test Results Summary:');
      console.log('========================');
      console.log(`Local MongoDB:      ${results.local ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`MongoDB Atlas:      ${results.cloud ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Basic Operations:   ${results.basicOperations ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Index Support:      ${results.indexSupport ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Aggregation:        ${results.aggregationSupport ? '✅ PASS' : '❌ FAIL'}`);

      const allPassed = Object.values(results).every(result => result);
      
      if (allPassed) {
        console.log('\n🎉 All tests passed! Ready for migration.');
        console.log('\n💡 Next steps:');
        console.log('   1. Run: npm run migrate:mongodb --dry-run');
        console.log('   2. If satisfied, run: npm run migrate:mongodb --backup');
      } else {
        console.log('\n⚠️  Some tests failed. Please check your configuration.');
        this.printTroubleshooting();
      }

      return allPassed;

    } catch (error) {
      console.error('\n💥 Test suite failed:', error.message);
      this.printTroubleshooting();
      return false;
    }
  }

  async testLocalConnection() {
    if (!this.localUri) {
      console.log('❌ Local MongoDB URI not configured');
      return false;
    }

    try {
      const client = new MongoClient(this.localUri);
      await client.connect();
      
      const db = client.db();
      await db.admin().ping();
      
      const collections = await db.listCollections().toArray();
      console.log(`✅ Connected to local MongoDB (${collections.length} collections)`);
      
      await client.close();
      return true;
      
    } catch (error) {
      console.log(`❌ Local MongoDB connection failed: ${error.message}`);
      return false;
    }
  }

  async testCloudConnection() {
    if (!this.cloudUri) {
      console.log('❌ MongoDB Atlas URI not configured (MONGO_CLOUD_URI)');
      return false;
    }

    try {
      console.log(`🔌 Connecting to: ${this.cloudUri.replace(/\/\/.*@/, '//***:***@')}`);
      
      const client = new MongoClient(this.cloudUri);
      await client.connect();
      
      const db = client.db();
      const adminResult = await db.admin().ping();
      
      const serverStatus = await db.admin().serverStatus();
      console.log(`✅ Connected to MongoDB Atlas (v${serverStatus.version})`);
      
      const collections = await db.listCollections().toArray();
      console.log(`📊 Database stats: ${collections.length} collections`);
      
      await client.close();
      return true;
      
    } catch (error) {
      console.log(`❌ MongoDB Atlas connection failed: ${error.message}`);
      
      if (error.message.includes('authentication failed')) {
        console.log('💡 Check your username and password in the connection string');
      } else if (error.message.includes('network')) {
        console.log('💡 Check your network connectivity and IP whitelist');
      }
      
      return false;
    }
  }

  async testBasicOperations() {
    try {
      const client = new MongoClient(this.cloudUri);
      await client.connect();
      
      const db = client.db();
      const testCollection = db.collection('__test_collection');
      
      // Test insert
      const insertResult = await testCollection.insertOne({
        _id: 'test-doc-1',
        test: true,
        timestamp: new Date(),
        data: { message: 'MongoDB Atlas connection test' }
      });
      
      // Test find
      const findResult = await testCollection.findOne({ _id: 'test-doc-1' });
      
      // Test update
      await testCollection.updateOne(
        { _id: 'test-doc-1' },
        { $set: { updated: true } }
      );
      
      // Test count
      const count = await testCollection.countDocuments({ test: true });
      
      // Test delete
      await testCollection.deleteOne({ _id: 'test-doc-1' });
      
      // Clean up
      await testCollection.drop().catch(() => {}); // Ignore errors
      
      await client.close();
      
      console.log('✅ Basic CRUD operations working');
      return true;
      
    } catch (error) {
      console.log(`❌ Basic operations failed: ${error.message}`);
      return false;
    }
  }

  async testIndexSupport() {
    try {
      const client = new MongoClient(this.cloudUri);
      await client.connect();
      
      const db = client.db();
      const testCollection = db.collection('__test_indexes');
      
      // Create test data
      await testCollection.insertMany([
        { email: 'test1@example.com', status: 'active' },
        { email: 'test2@example.com', status: 'inactive' }
      ]);
      
      // Create compound index
      await testCollection.createIndex(
        { email: 1, status: 1 },
        { name: 'email_status_index', unique: true }
      );
      
      // Create text index
      await testCollection.createIndex(
        { email: 'text' },
        { name: 'email_text_index' }
      );
      
      // List indexes
      const indexes = await testCollection.listIndexes().toArray();
      
      // Clean up
      await testCollection.drop().catch(() => {});
      
      await client.close();
      
      console.log(`✅ Index support working (created ${indexes.length} indexes)`);
      return true;
      
    } catch (error) {
      console.log(`❌ Index support failed: ${error.message}`);
      return false;
    }
  }

  async testAggregationSupport() {
    try {
      const client = new MongoClient(this.cloudUri);
      await client.connect();
      
      const db = client.db();
      const testCollection = db.collection('__test_aggregation');
      
      // Create test data
      await testCollection.insertMany([
        { category: 'docs', size: 1024, owner: 'user1' },
        { category: 'docs', size: 2048, owner: 'user1' },
        { category: 'images', size: 512, owner: 'user2' },
        { category: 'docs', size: 1536, owner: 'user2' }
      ]);
      
      // Test aggregation pipeline
      const aggregationResult = await testCollection.aggregate([
        { $match: { category: 'docs' } },
        { $group: {
          _id: '$owner',
          totalSize: { $sum: '$size' },
          count: { $sum: 1 }
        }},
        { $sort: { totalSize: -1 } }
      ]).toArray();
      
      // Clean up
      await testCollection.drop().catch(() => {});
      
      await client.close();
      
      console.log(`✅ Aggregation support working (${aggregationResult.length} results)`);
      return true;
      
    } catch (error) {
      console.log(`❌ Aggregation support failed: ${error.message}`);
      return false;
    }
  }

  printTroubleshooting() {
    console.log('\n🔧 Troubleshooting:');
    console.log('==================');
    console.log('1. Verify MONGO_CLOUD_URI in your .env file');
    console.log('2. Check MongoDB Atlas IP whitelist (0.0.0.0/0 for testing)');
    console.log('3. Verify database user permissions (readWrite role)');
    console.log('4. Test network connectivity to MongoDB Atlas');
    console.log('5. Check for firewall blocking MongoDB port (27017)');
    console.log('\n📋 Required .env variables:');
    console.log('   MONGO_URI=mongodb://localhost:27017/luminpdf');
    console.log('   MONGO_CLOUD_URI=mongodb+srv://username:password@cluster.mongodb.net/luminpdf');
  }

  printConfiguration() {
    console.log('\n⚙️  Current Configuration:');
    console.log('=========================');
    console.log(`Local URI:  ${this.localUri ? this.localUri.replace(/\/\/.*@/, '//***:***@') : 'Not set'}`);
    console.log(`Cloud URI:  ${this.cloudUri ? this.cloudUri.replace(/\/\/.*@/, '//***:***@') : 'Not set'}`);
  }
}

async function main() {
  const tester = new MongoCloudTester();
  
  // Print configuration
  tester.printConfiguration();
  console.log('');
  
  // Run tests
  const success = await tester.testConnections();
  
  process.exit(success ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled error:', error.message);
  process.exit(1);
});

// Run tests
if (require.main === module) {
  main();
} 