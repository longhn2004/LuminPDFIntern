# Quick Migration Instructions

## 🚀 How to Migrate to S3

### Prerequisites
1. Set up AWS S3 bucket and IAM permissions (see [MIGRATION_TO_S3.md](./docs/MIGRATION_TO_S3.md))
2. Configure environment variables in `.env`

### Step 1: Test Configuration
```bash
npm run test:s3
```

### Step 2: Preview Migration (Dry Run)
```bash
npm run migrate:s3:dry-run
```

### Step 3: Backup and Migrate
```bash
npm run migrate:s3:backup
```

### Alternative: Migrate in Smaller Batches
```bash
# Migrate 5 files at a time
npm run migrate:s3 -- --batch-size=5 --backup
```

## 🔄 How to Rollback (If Needed)

### Preview Rollback (Dry Run)
```bash
npm run rollback:s3:dry-run
```

### Perform Rollback
```bash
npm run rollback:s3:backup
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run test:s3` | Test S3 connectivity and configuration |
| `npm run migrate:s3:dry-run` | Preview migration without changes |
| `npm run migrate:s3:backup` | Migrate with database backup |
| `npm run migrate:s3:help` | Show migration help |
| `npm run rollback:s3:dry-run` | Preview rollback without changes |
| `npm run rollback:s3:backup` | Rollback with database backup |
| `npm run rollback:s3:help` | Show rollback help |

## 🛡️ Safety Features

- **Dry Run Mode**: Preview what will happen without making changes
- **Automatic Backups**: Database snapshots before migrations
- **Batch Processing**: Avoid overwhelming the system
- **Error Reporting**: Detailed error logs and recovery instructions
- **Resumable**: Can continue from specific file ID if interrupted

## 🔧 Environment Variables Required

```env
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_BUCKET_URL=https://your-bucket-name.s3.amazonaws.com
```

## 📊 Migration Process

1. **Pre-flight Check**: Verifies AWS configuration
2. **Backup Creation**: Creates database backup (if `--backup` flag used)
3. **File Processing**: Uploads files to S3 in batches
4. **Database Update**: Updates file paths to S3 keys
5. **Summary Report**: Shows migration results
6. **Error Handling**: Saves detailed error report if issues occur

## 🚨 Troubleshooting

### Common Issues:
- **AWS credentials error**: Check environment variables
- **File not found**: Verify local file paths in database
- **S3 access denied**: Check IAM permissions
- **Network issues**: Check internet connectivity

### Getting Help:
```bash
npm run migrate:s3:help
npm run rollback:s3:help
```

For detailed troubleshooting, see [MIGRATION_TO_S3.md](./MIGRATION_TO_S3.md#troubleshooting). 