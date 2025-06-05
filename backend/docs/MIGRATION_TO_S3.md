# Migration Guide: Local File Storage to AWS S3

This guide explains how to migrate your LuminPDF application from local file storage to AWS S3.

## Overview

The migration involves:
1. Setting up AWS S3 bucket and IAM permissions
2. Updating environment configuration
3. Using the new S3-based file handling
4. Migrating existing files (optional)

## Prerequisites

- AWS Account with S3 access
- AWS CLI configured (optional, for initial setup)
- Basic understanding of AWS IAM and S3

## Step 1: AWS S3 Setup

### 1.1 Create S3 Bucket

1. Log into AWS Console and navigate to S3
2. Create a new bucket with a unique name (e.g., `luminpdf-files-prod`)
3. Choose your preferred region
4. Configure bucket settings:
   - **Block public access**: Keep enabled for security
   - **Versioning**: Optional (recommended for production)
   - **Encryption**: Enable server-side encryption

### 1.2 Create IAM User and Policy

Create a dedicated IAM user for the application:

1. Go to IAM → Users → Create User
2. Create a user named `luminpdf-s3-user`
3. Create and attach a custom policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:HeadObject"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name"
        }
    ]
}
```

4. Generate Access Keys for this user and save them securely

## Step 2: Environment Configuration

Update your `.env` file with the following AWS configuration:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_BUCKET_URL=https://your-bucket-name.s3.amazonaws.com
```

### Environment Variables Explanation:

- `AWS_ACCESS_KEY_ID`: IAM user access key
- `AWS_SECRET_ACCESS_KEY`: IAM user secret key
- `AWS_REGION`: AWS region where your bucket is located
- `AWS_S3_BUCKET_NAME`: Name of your S3 bucket
- `AWS_S3_BUCKET_URL`: Public URL of your bucket (optional, for custom domains)

## Step 3: Code Changes Summary

The migration includes the following changes:

### 3.1 New Dependencies
- `@aws-sdk/client-s3`: AWS S3 client
- `@aws-sdk/s3-request-presigner`: For generating signed URLs
- `multer-s3`: Multer storage engine for S3 (not directly used but good to have)

### 3.2 New Services
- `S3Service`: Handles all S3 operations (upload, download, delete)

### 3.3 Updated Components
- `FileModule`: Changed from disk storage to memory storage
- `FileService`: Updated to use S3Service instead of local file operations

## Step 4: Key Differences

### File Storage
- **Before**: Files stored in `./uploads` directory
- **After**: Files stored in S3 bucket with structured keys (e.g., `pdfs/timestamp-uuid.pdf`)

### File Downloads
- **Before**: Direct file serving from local disk
- **After**: Signed URLs with 1-hour expiry for secure access

### File Paths
- **Before**: Local file system paths
- **After**: S3 object keys stored in database

## Step 5: Testing the Migration

1. Start the application with new environment variables
2. Test file upload functionality
3. Test file download functionality
4. Test Google Drive integration
5. Verify file deletion works correctly

### Test Checklist:
- [ ] Upload PDF file via web interface
- [ ] Upload file from Google Drive
- [ ] Download file (should redirect to signed S3 URL)
- [ ] Download file with annotations
- [ ] Delete file (should remove from both DB and S3)
- [ ] Shareable links work correctly
- [ ] Cache functionality works with S3

## Step 6: Migrating Existing Files (Optional)

If you have existing files in local storage that need to be migrated to S3:

### 6.1 Create Migration Script

```typescript
// migration-script.ts
import { S3Service } from './src/file/s3.service';
import { FileService } from './src/file/file.service';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

async function migrateFilesToS3() {
  // Get all files from database
  const files = await fileModel.find({}).exec();
  
  for (const file of files) {
    const localPath = file.path;
    
    if (existsSync(localPath)) {
      try {
        // Read local file
        const fileBuffer = readFileSync(localPath);
        const mockFile = {
          buffer: fileBuffer,
          originalname: file.name,
          mimetype: 'application/pdf'
        } as Express.Multer.File;
        
        // Upload to S3
        const s3Key = await s3Service.uploadFile(mockFile);
        
        // Update database with S3 key
        await fileModel.findByIdAndUpdate(file._id, { path: s3Key });
        
        console.log(`Migrated: ${file.name} -> ${s3Key}`);
      } catch (error) {
        console.error(`Failed to migrate ${file.name}:`, error);
      }
    }
  }
}
```

### 6.2 Run Migration
```bash
# Backup your database first!
mongodump --db luminpdf --out ./backup

# Run migration script
npm run migration:s3
```

## Step 7: Production Deployment

### 7.1 Security Considerations
- Use IAM roles instead of access keys in production (if deploying to AWS)
- Enable S3 bucket logging for audit trails
- Consider using S3 Transfer Acceleration for global users
- Set up CloudFront CDN for better performance

### 7.2 Monitoring
- Set up CloudWatch alarms for S3 operations
- Monitor S3 costs and storage usage
- Log S3 errors and performance metrics

### 7.3 Backup Strategy
- Enable S3 versioning
- Set up cross-region replication if needed
- Configure lifecycle policies for cost optimization

## Step 8: Rollback Plan

If you need to rollback to local storage:

1. Stop the application
2. Revert code changes to use disk storage
3. Download files from S3 to local storage
4. Update database paths to point to local files
5. Update environment configuration

## Troubleshooting

### Common Issues:

#### 1. AWS Credentials Error
```
Error: AWS S3 configuration is incomplete
```
**Solution**: Verify all AWS environment variables are set correctly

#### 2. S3 Access Denied
```
Error: Access Denied
```
**Solution**: Check IAM policy and bucket permissions

#### 3. File Not Found in S3
```
Error: NoSuchKey: The specified key does not exist
```
**Solution**: Verify S3 key exists and is correctly stored in database

#### 4. Large File Upload Issues
**Solution**: Consider using S3 multipart upload for files > 5MB

### Debug Mode
Enable detailed logging by setting:
```env
LOG_LEVEL=debug
```

## Cost Optimization

### S3 Storage Classes
Consider using different storage classes based on access patterns:
- **Standard**: For frequently accessed files
- **IA (Infrequent Access)**: For files accessed less than once per month
- **Glacier**: For archival storage

### Lifecycle Policies
Set up S3 lifecycle policies to automatically transition files to cheaper storage classes over time.

## Security Best Practices

1. **Never commit AWS credentials** to version control
2. **Use signed URLs** with short expiry times (default: 1 hour)
3. **Enable bucket logging** for audit trails
4. **Use HTTPS only** for all S3 operations
5. **Regularly rotate** IAM access keys
6. **Monitor unusual access** patterns

## Performance Optimization

1. **Use CloudFront** CDN for better global performance
2. **Enable Transfer Acceleration** for faster uploads
3. **Optimize file keys** for better performance (avoid sequential patterns)
4. **Use multipart upload** for large files
5. **Implement caching** at application level (already included)

## Conclusion

This migration provides several benefits:
- **Scalability**: No local storage limitations
- **Reliability**: AWS S3 99.999999999% durability
- **Security**: Signed URLs and fine-grained access control
- **Performance**: CDN integration possibilities
- **Cost**: Pay only for what you use

The migration maintains backward compatibility and includes comprehensive error handling and caching for optimal performance. 