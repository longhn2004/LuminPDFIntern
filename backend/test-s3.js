#!/usr/bin/env node

/**
 * S3 Connection Test Script
 * 
 * This script tests the S3 configuration and connectivity.
 * Run this before starting the application to ensure S3 is properly configured.
 * 
 * Usage: node test-s3.js
 */

require('dotenv').config();
const { S3Client, ListBucketsCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');

async function testS3Connection() {
  console.log('🧪 Testing S3 Configuration...\n');
  
  // Check environment variables
  const requiredEnvVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_S3_BUCKET_NAME'
  ];
  
  console.log('📋 Checking environment variables:');
  let missingVars = [];
  
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: ${envVar.includes('SECRET') ? '*'.repeat(value.length) : value}`);
    } else {
      console.log(`❌ ${envVar}: Missing`);
      missingVars.push(envVar);
    }
  }
  
  if (missingVars.length > 0) {
    console.log(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.log('Please update your .env file and try again.');
    process.exit(1);
  }
  
  // Initialize S3 client
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  
  console.log('\n🔗 Testing S3 connectivity...');
  
  try {
    // Test basic S3 access
    const listBucketsCommand = new ListBucketsCommand({});
    const bucketsResult = await s3Client.send(listBucketsCommand);
    console.log('✅ Successfully connected to S3');
    console.log(`📦 Found ${bucketsResult.Buckets.length} accessible buckets`);
    
    // Test specific bucket access
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    console.log(`\n🪣 Testing access to bucket: ${bucketName}`);
    
    const headBucketCommand = new HeadBucketCommand({ Bucket: bucketName });
    await s3Client.send(headBucketCommand);
    console.log('✅ Successfully accessed target bucket');
    
    // Check if target bucket exists in the list
    const targetBucket = bucketsResult.Buckets.find(bucket => bucket.Name === bucketName);
    if (targetBucket) {
      console.log(`✅ Bucket found in account (Created: ${targetBucket.CreationDate})`);
    } else {
      console.log('⚠️  Bucket not owned by this account but accessible');
    }
    
    console.log('\n🎉 S3 configuration test completed successfully!');
    console.log('\n📝 Configuration Summary:');
    console.log(`   Region: ${process.env.AWS_REGION}`);
    console.log(`   Bucket: ${process.env.AWS_S3_BUCKET_NAME}`);
    console.log(`   Bucket URL: ${process.env.AWS_S3_BUCKET_URL || 'Not set (will use default)'}`);
    
    console.log('\n✅ Your application is ready to use S3 storage!');
    
  } catch (error) {
    console.log('\n❌ S3 configuration test failed:');
    
    if (error.name === 'CredentialsProviderError') {
      console.log('   Issue: Invalid AWS credentials');
      console.log('   Solution: Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    } else if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.log(`   Issue: Bucket '${process.env.AWS_S3_BUCKET_NAME}' not found`);
      console.log('   Solution: Create the bucket or check the bucket name');
    } else if (error.name === 'Forbidden' || error.$metadata?.httpStatusCode === 403) {
      console.log('   Issue: Access denied to S3 or bucket');
      console.log('   Solution: Check IAM permissions and bucket policies');
    } else if (error.name === 'NetworkingError') {
      console.log('   Issue: Network connectivity problem');
      console.log('   Solution: Check your internet connection and firewall settings');
    } else {
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code || error.name}`);
    }
    
    console.log('\n📖 For detailed setup instructions, see: ./MIGRATION_TO_S3.md');
    process.exit(1);
  }
}

// Run the test
testS3Connection().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
}); 