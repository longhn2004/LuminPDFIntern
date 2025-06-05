# 🚂 Railway Deployment Guide

This guide will help you deploy your LuminPDF backend to Railway with secure handling of service account credentials.

## 📋 Pre-Deployment Checklist

- [ ] Service account key file exists at `config/service-account-key.json`
- [ ] MongoDB Atlas cluster configured
- [ ] AWS S3 bucket set up
- [ ] Google OAuth credentials ready
- [ ] All environment variables prepared

## 🔐 Step 1: Prepare Service Account Credentials

### Option A: Using the Preparation Script (Recommended)

```bash
# Run the preparation script
npm run prepare:railway

# This will:
# 1. Validate your service account key
# 2. Convert it to environment variable format
# 3. Generate a template with all required variables
# 4. Save to railway-env-vars.txt (gitignored)
```

### Option B: Manual Preparation

```bash
# Read your service account key and minify it
cat config/service-account-key.json | tr -d '\n' | tr -d ' '

# Copy the output - this will be your GOOGLE_SERVICE_ACCOUNT_KEY value
```

## 🚀 Step 2: Deploy to Railway

### Method 1: Web Interface (Easiest)

1. **Create Railway Account**
   - Go to [Railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select the `backend` folder as root directory

3. **Configure Environment Variables**
   - Go to your project → Settings → Variables
   - Add all environment variables (see template below)

4. **Deploy**
   - Railway will automatically deploy your backend
   - Get your deployment URL from the project dashboard

### Method 2: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init

# Set the source directory to backend
railway config

# Add environment variables
railway variables set NODE_ENV=production
railway variables set PORT=5000
# ... add all other variables

# Deploy
railway up
```

## ⚙️ Environment Variables Template

Copy these to Railway project settings (update values):

```env
# Core Configuration
NODE_ENV=production
PORT=5000

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/luminpdf
MONGO_CLOUD_URI=mongodb+srv://username:password@cluster.mongodb.net/luminpdf

# JWT Secrets (generate secure random strings)
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-different-from-jwt

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-railway-domain.up.railway.app/api/auth/google/callback

# Google Service Account (from preparation script)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project",...}

# AWS S3
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your-40-character-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-s3-bucket-name
AWS_S3_BUCKET_URL=https://your-s3-bucket-name.s3.amazonaws.com

# Redis (optional - Railway provides managed Redis)
REDIS_URL=redis://default:password@redis-service:6379

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password

# Frontend URLs (update after frontend deployment)
APP_URL=https://your-frontend-domain.vercel.app
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

## 🔒 Security Configuration

### 1. Update Google OAuth Settings

After deployment, update your Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 client
4. Add to Authorized Origins:
   ```
   https://your-railway-domain.up.railway.app
   ```
5. Add to Authorized Redirect URIs:
   ```
   https://your-railway-domain.up.railway.app/api/auth/google/callback
   ```

### 2. MongoDB Atlas Security

1. Go to MongoDB Atlas → Network Access
2. Remove `0.0.0.0/0` if it exists
3. Add Railway's IP addresses or use `0.0.0.0/0` with strong authentication

### 3. AWS S3 CORS Configuration

Update your S3 bucket CORS policy:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "https://your-railway-domain.up.railway.app",
      "https://your-frontend-domain.vercel.app"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

## 📊 Post-Deployment Steps

### 1. Test Your Deployment

```bash
# Test health endpoint
curl https://your-railway-domain.up.railway.app/health

# Test authentication
curl https://your-railway-domain.up.railway.app/api/auth/me

# Test Google credentials (important for Google Drive integration)
curl https://your-railway-domain.up.railway.app/api/file/google/test-credentials
```

### 2. Verify Google Drive Integration

After deployment, test the Google Drive integration:

1. **Via Test Endpoint**:
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        https://your-railway-domain.up.railway.app/api/file/google/test-credentials
   ```

2. **Expected Response**:
   ```json
   {
     "status": "success",
     "message": "Google credentials working correctly for project: your-project-id"
   }
   ```

3. **If you get an error**, check:
   - `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable is set correctly
   - JSON format is valid (use `npm run prepare:railway` to validate)
   - Service account has necessary permissions

### 3. Monitor Logs

```bash
# Using Railway CLI
railway logs

# Or view in Railway dashboard
```

### 4. Set Up Custom Domain (Optional)

1. Go to Railway project → Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update all environment variables to use new domain

## 🚨 Troubleshooting

### Common Issues

#### 1. Service Account Key Errors

```
Error: Google service account credentials not found
```

**Solutions:**
- Ensure `GOOGLE_SERVICE_ACCOUNT_KEY` is set correctly in Railway environment variables
- Validate JSON format using `npm run prepare:railway` locally
- Check that the JSON is minified (single line, no extra spaces)
- Test credentials using `/api/file/google/test-credentials` endpoint

**Validation Steps:**
```bash
# 1. Locally validate your service account key
npm run prepare:railway

# 2. Copy the generated GOOGLE_SERVICE_ACCOUNT_KEY value to Railway
# 3. Deploy and test:
curl https://your-railway-domain.up.railway.app/api/file/google/test-credentials

# 4. Check Railway logs for detailed error messages
railway logs --follow
```

**Common JSON Format Issues:**
- Extra quotes or escape characters
- Line breaks in the JSON string
- Missing required fields (type, project_id, private_key, client_email)
- Corrupted private_key field

#### 2. MongoDB Connection Issues

```
Error: Could not connect to MongoDB
```

**Solutions:**
- Verify `MONGO_URI` connection string
- Check MongoDB Atlas IP whitelist
- Ensure database user has correct permissions

#### 3. S3 Upload Errors

```
Error: S3 access denied
```

**Solutions:**
- Verify AWS credentials are correct
- Check S3 bucket policy and CORS
- Ensure IAM user has S3 permissions

#### 4. OAuth Redirect Errors

```
Error: redirect_uri_mismatch
```

**Solutions:**
- Update Google OAuth settings with Railway domain
- Check `GOOGLE_CALLBACK_URL` environment variable
- Ensure redirect URI exactly matches Google Cloud Console

### Debug Environment Variables

Add this temporary endpoint to check environment variables:

```typescript
// Add to app.controller.ts (remove after debugging)
@Get('debug-env')
debugEnv() {
  return {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    mongoUri: process.env.MONGO_URI ? '✅ Set' : '❌ Missing',
    jwtSecret: process.env.JWT_SECRET ? '✅ Set' : '❌ Missing',
    googleClientId: process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing',
    googleServiceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? '✅ Set' : '❌ Missing',
    awsAccessKey: process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing',
  };
}
```

### View Detailed Logs

```bash
# Railway CLI commands
railway logs --follow
railway status
railway variables
```

## 📈 Performance Optimization

### 1. Enable Production Optimizations

Railway automatically sets `NODE_ENV=production`, which enables:
- Optimized builds
- Minified assets
- Better error handling
- Performance monitoring

### 2. Database Connection Pooling

Your Mongoose connection automatically uses connection pooling in production.

### 3. Memory Management

Railway provides monitoring for:
- Memory usage
- CPU usage
- Response times
- Error rates

## 🔄 Continuous Deployment

Railway automatically redeploys when you push to your main branch. To customize:

1. **Railway.toml Configuration**

Create `railway.toml` in your backend directory:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm run build"

[deploy]
startCommand = "npm run start:prod"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

2. **Branch-based Deployments**

- `main` branch → Production environment
- `develop` branch → Staging environment

## 💰 Cost Management

### Railway Pricing
- **Starter Plan**: $5/month for 500 execution hours
- **Pro Plan**: $20/month for unlimited execution hours
- **Pay-per-use**: $0.000231/GB-hour for memory

### Optimization Tips
- Use efficient database queries
- Implement proper caching with Redis
- Monitor resource usage in Railway dashboard
- Set up alerts for usage limits

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Examples](https://github.com/railwayapp/examples)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)
- [NestJS Deployment Guide](https://docs.nestjs.com/techniques/deployment)

---

**🎯 Quick Deploy Checklist:**

1. ✅ Run `npm run prepare:railway`
2. ✅ Create Railway project from GitHub
3. ✅ Add all environment variables
4. ✅ Update Google OAuth settings
5. ✅ Test deployment with health check
6. ✅ Test Google credentials with `/api/file/google/test-credentials`
7. ✅ Deploy frontend with backend URL