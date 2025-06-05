# MongoDB Atlas Migration Guide

This guide will help you migrate your local MongoDB database to MongoDB Atlas (cloud).

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [MongoDB Atlas Setup](#mongodb-atlas-setup)
3. [Environment Configuration](#environment-configuration)
4. [Pre-Migration Testing](#pre-migration-testing)
5. [Migration Process](#migration-process)
6. [Post-Migration Steps](#post-migration-steps)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Instructions](#rollback-instructions)

## 🚀 Prerequisites

Before starting the migration, ensure you have:

- [ ] Local MongoDB instance running with your current data
- [ ] MongoDB Atlas account created
- [ ] Administrative access to your local MongoDB
- [ ] Node.js and npm installed
- [ ] Backup of your current database
- [ ] Network connectivity to MongoDB Atlas

## ☁️ MongoDB Atlas Setup

### Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account or log in
3. Create a new project for your application

### Step 2: Create a Cluster

1. Click **"Build a Cluster"**
2. Choose **"Shared Clusters"** for the free tier
3. Select your preferred cloud provider and region
4. Choose cluster tier (M0 Sandbox for free)
5. Click **"Create Cluster"**

**Wait 1-3 minutes for cluster creation to complete.**

### Step 3: Configure Database Access

1. Go to **"Database Access"** in the left sidebar
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Create username and secure password
5. Set user privileges to **"Read and write to any database"**
6. Click **"Add User"**

### Step 4: Configure Network Access

1. Go to **"Network Access"** in the left sidebar
2. Click **"Add IP Address"**
3. For testing: Click **"Allow Access from Anywhere"** (0.0.0.0/0)
4. For production: Add specific IP addresses
5. Click **"Confirm"**

⚠️ **Security Note**: For production, restrict IP access to specific addresses.

### Step 5: Get Connection String

1. Go to **"Clusters"** in the left sidebar
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Select **"Node.js"** driver and version **"4.1 or later"**
5. Copy the connection string

The connection string will look like:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/luminpdf?retryWrites=true&w=majority
```

## ⚙️ Environment Configuration

### Step 1: Update Environment Variables

Add the MongoDB Atlas connection string to your `.env` file:

```env
# Local MongoDB (keep for migration)
MONGO_URI=mongodb://localhost:27017/luminpdf

# MongoDB Atlas (new)
MONGO_CLOUD_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/luminpdf?retryWrites=true&w=majority
```

**Replace:**
- `username` with your database username
- `password` with your database password
- `cluster0.xxxxx` with your actual cluster details
- `luminpdf` with your database name

### Step 2: Install Required Dependencies

The required MongoDB dependencies should already be installed:

```bash
npm install mongodb mongoose
```

## 🧪 Pre-Migration Testing

Before migrating, test your MongoDB Atlas connectivity:

```bash
npm run test:mongodb
```

This will test:
- ✅ Local MongoDB connection
- ✅ MongoDB Atlas connection
- ✅ Basic CRUD operations
- ✅ Index support
- ✅ Aggregation pipeline support

If all tests pass, you're ready to migrate!

## 🚀 Migration Process

### Step 1: Preview Migration (Dry Run)

First, see what will be migrated without making changes:

```bash
npm run migrate:mongodb:dry-run
```

This shows:
- Collections to be migrated
- Document counts
- Index information
- No actual data transfer

### Step 2: Create Backup

**Always create a backup before migration:**

```bash
npm run migrate:mongodb:backup
```

This creates:
- Complete mongodump backup in `./backups/`
- JSON backup of all collections
- Timestamp for easy identification

### Step 3: Run Migration

Migrate all data to MongoDB Atlas:

```bash
npm run migrate:mongodb:backup
```

**Migration Process:**
1. Connects to both local and cloud databases
2. Creates backup (if `--backup` flag used)
3. Migrates collections in batches
4. Transfers documents and indexes
5. Provides detailed progress reports

### Step 4: Verify Migration

After migration, verify your data:

```bash
# Test cloud database again
npm run test:mongodb

# Check collection counts match
# Compare critical documents
# Verify application functionality
```

## 📊 Migration Options

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run test:mongodb` | Test MongoDB Atlas connectivity |
| `npm run migrate:mongodb:dry-run` | Preview migration without changes |
| `npm run migrate:mongodb:backup` | Migrate with backup creation |
| `npm run migrate:mongodb:help` | Show detailed help |

### Advanced Options

```bash
# Migrate specific collections only
npm run migrate:mongodb -- --collections=users,files

# Smaller batch sizes for slower connections
npm run migrate:mongodb -- --batch-size=500

# Skip index migration
npm run migrate:mongodb -- --skip-indexes

# Get help with all options
npm run migrate:mongodb:help
```

## 🔄 Post-Migration Steps

### Step 1: Update Application Configuration

**Option A: Use Cloud Database Immediately**

Update your `app.module.ts` to use the cloud URI:

```typescript
MongooseModule.forRoot(process.env.MONGO_CLOUD_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/luminpdf'),
```

**Option B: Gradual Migration**

Keep both connections available and switch gradually.

### Step 2: Update Environment Variables

For production deployment:

```env
# Production environment
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/luminpdf
# Remove MONGO_CLOUD_URI or keep as backup
```

### Step 3: Test Application

1. Start the application
2. Test all critical features
3. Verify data integrity
4. Monitor performance
5. Check error logs

### Step 4: Production Deployment

1. Update production environment variables
2. Deploy application changes
3. Monitor application health
4. Have rollback plan ready

## 🛡️ Security Best Practices

### MongoDB Atlas Security

1. **IP Whitelisting**: Remove 0.0.0.0/0 after testing
2. **Database Users**: Use principle of least privilege
3. **Connection Encryption**: Always use TLS (included in connection string)
4. **VPC Peering**: Consider for production environments
5. **Monitoring**: Enable MongoDB Atlas monitoring

### Application Security

1. **Environment Variables**: Never commit credentials to code
2. **Connection Pooling**: Configure appropriate pool sizes
3. **Read Preferences**: Use appropriate read preferences
4. **Write Concerns**: Configure for your consistency needs

## 🚨 Troubleshooting

### Common Issues

#### Connection Errors

**Error**: `Authentication failed`
```
💡 Solutions:
- Check username/password in connection string
- Verify database user exists in Atlas
- Ensure user has correct permissions
```

**Error**: `Network timeout`
```
💡 Solutions:
- Check IP whitelist in MongoDB Atlas
- Verify network connectivity
- Test with 0.0.0.0/0 temporarily
- Check firewall settings
```

**Error**: `Database not found`
```
💡 Solutions:
- Database will be created automatically
- Verify database name in connection string
- Check cluster status in Atlas
```

#### Migration Issues

**Error**: `Collection already exists`
```
💡 Solutions:
- Migration will skip existing collections with data
- Use rollback script to clean cloud database
- Manually drop collections if needed
```

**Error**: `Batch insert failed`
```
💡 Solutions:
- Reduce batch size: --batch-size=100
- Check document size limits (16MB)
- Verify network stability
```

**Error**: `Index creation failed`
```
💡 Solutions:
- Indexes may already exist
- Check index compatibility
- Use --skip-indexes to skip index migration
```

### Performance Issues

**Slow Migration**
```
💡 Solutions:
- Use smaller batch sizes
- Check network bandwidth
- Consider migration during off-peak hours
- Use compression in connection string
```

**High Memory Usage**
```
💡 Solutions:
- Reduce batch size
- Monitor system resources
- Close other applications
- Consider server-side migration
```

### Getting Help

1. **Check logs**: Look for detailed error messages
2. **Test connectivity**: Run `npm run test:mongodb`
3. **Verify configuration**: Check environment variables
4. **MongoDB Atlas Support**: Use Atlas support if needed
5. **Community**: MongoDB community forums

## 🔄 Rollback Instructions

If you need to rollback to local MongoDB:

### Step 1: Preview Rollback

```bash
npm run rollback:mongodb:dry-run
```

### Step 2: Perform Rollback

```bash
npm run rollback:mongodb:backup
```

This will:
- Download all data from MongoDB Atlas
- Restore to local MongoDB
- Preserve existing local data (optional)
- Create backup before rollback

### Step 3: Update Configuration

Revert environment variables:

```env
MONGO_URI=mongodb://localhost:27017/luminpdf
# Comment out or remove MONGO_CLOUD_URI
```

## 📈 Monitoring and Maintenance

### MongoDB Atlas Monitoring

1. **Performance Advisor**: Get index and query recommendations
2. **Real-time Performance Panel**: Monitor current operations
3. **Profiler**: Analyze slow operations
4. **Alerts**: Set up alerts for important metrics

### Application Monitoring

1. **Connection Pool**: Monitor pool size and utilization
2. **Query Performance**: Track slow queries
3. **Error Rates**: Monitor database errors
4. **Resource Usage**: CPU, memory, and storage

### Regular Maintenance

1. **Index Optimization**: Review and optimize indexes
2. **Storage Monitoring**: Track storage usage and costs
3. **Security Reviews**: Regular security audits
4. **Backup Strategy**: Implement regular backup schedules

## 📚 Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [MongoDB University](https://university.mongodb.com/)

## 🎯 Migration Checklist

### Pre-Migration
- [ ] MongoDB Atlas cluster created and configured
- [ ] Database user created with proper permissions
- [ ] Network access configured
- [ ] Connection string obtained and tested
- [ ] Environment variables configured
- [ ] Pre-migration tests passed
- [ ] Backup created

### Migration
- [ ] Dry run completed successfully
- [ ] Migration executed with backup
- [ ] All collections migrated
- [ ] Document counts verified
- [ ] Indexes created successfully
- [ ] No critical errors reported

### Post-Migration
- [ ] Application updated to use cloud database
- [ ] Functionality testing completed
- [ ] Performance monitoring enabled
- [ ] Security settings reviewed
- [ ] Production deployment planned
- [ ] Rollback plan documented

---

**Need Help?** Run `npm run migrate:mongodb:help` for additional options and troubleshooting tips. 