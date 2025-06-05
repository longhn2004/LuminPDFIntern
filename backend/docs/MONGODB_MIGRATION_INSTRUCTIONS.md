# Quick MongoDB Atlas Migration Instructions

## 🚀 How to Migrate to MongoDB Atlas

### Prerequisites
1. Create MongoDB Atlas cluster and user (see [MIGRATION_TO_MONGODB_ATLAS.md](./MIGRATION_TO_MONGODB_ATLAS.md))
2. Configure environment variables in `.env`

### Step 1: Test Configuration
```bash
npm run test:mongodb
```

### Step 2: Preview Migration (Dry Run)
```bash
npm run migrate:mongodb:dry-run
```

### Step 3: Backup and Migrate
```bash
npm run migrate:mongodb:backup
```

### Alternative: Migrate Specific Collections
```bash
# Migrate only users and files collections
npm run migrate:mongodb -- --collections=users,files --backup
```

## 🔄 How to Rollback (If Needed)

### Preview Rollback (Dry Run)
```bash
npm run rollback:mongodb:dry-run
```

### Perform Rollback
```bash
npm run rollback:mongodb:backup
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run test:mongodb` | Test MongoDB Atlas connectivity |
| `npm run migrate:mongodb:dry-run` | Preview migration without changes |
| `npm run migrate:mongodb:backup` | Migrate with database backup |
| `npm run migrate:mongodb:help` | Show migration help |
| `npm run rollback:mongodb:dry-run` | Preview rollback without changes |
| `npm run rollback:mongodb:backup` | Rollback with database backup |
| `npm run rollback:mongodb:help` | Show rollback help |

## 🛡️ Safety Features

- **Dry Run Mode**: Preview what will happen without making changes
- **Automatic Backups**: Database snapshots before migrations
- **Batch Processing**: Configurable batch sizes for performance
- **Error Reporting**: Detailed error logs and recovery instructions
- **Index Migration**: Preserves database indexes and structure
- **Collision Detection**: Skips existing collections with data

## 🔧 Environment Variables Required

```env
# Local MongoDB
MONGO_URI=mongodb://localhost:27017/luminpdf

# MongoDB Atlas
MONGO_CLOUD_URI=mongodb+srv://username:password@cluster.mongodb.net/luminpdf?retryWrites=true&w=majority
```

## 📊 Migration Process

1. **Pre-flight Check**: Verifies both database connections
2. **Backup Creation**: Creates mongodump and JSON backups (if `--backup` flag used)
3. **Collection Discovery**: Lists all collections in local database
4. **Data Transfer**: Migrates documents in configurable batches
5. **Index Migration**: Recreates indexes on cloud database
6. **Verification**: Provides detailed summary report
7. **Error Handling**: Saves detailed error report if issues occur

## 🚨 Troubleshooting

### Common Issues:
- **Authentication failed**: Check username/password in connection string
- **Network timeout**: Verify IP whitelist in MongoDB Atlas
- **Collection exists**: Migration skips existing collections with data
- **Index creation failed**: Indexes may already exist or be incompatible

### Advanced Options:
```bash
# Smaller batches for slower connections
npm run migrate:mongodb -- --batch-size=500 --backup

# Skip index migration
npm run migrate:mongodb -- --skip-indexes --backup

# Migrate specific collections only
npm run migrate:mongodb -- --collections=users,files --backup
```

### Getting Help:
```bash
npm run migrate:mongodb:help
npm run rollback:mongodb:help
```

For detailed setup and troubleshooting, see [MIGRATION_TO_MONGODB_ATLAS.md](./MIGRATION_TO_MONGODB_ATLAS.md).

## 🎯 Quick Checklist

### Before Migration:
- [ ] MongoDB Atlas cluster created
- [ ] Database user configured with readWrite permissions
- [ ] IP whitelist configured (0.0.0.0/0 for testing)
- [ ] Connection string added to `.env`
- [ ] `npm run test:mongodb` passes all tests

### Migration Steps:
- [ ] `npm run migrate:mongodb:dry-run` - Preview
- [ ] `npm run migrate:mongodb:backup` - Execute with backup
- [ ] Verify data in MongoDB Atlas
- [ ] Update application to use `MONGO_CLOUD_URI`
- [ ] Test application functionality

### Post-Migration:
- [ ] Application works with cloud database
- [ ] Remove IP whitelist 0.0.0.0/0 restriction
- [ ] Set up monitoring and alerts
- [ ] Update production environment variables 