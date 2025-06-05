# 🚀 LuminPDF Deployment Quick Start

## 📋 Quick Deployment Options

### 🔥 Fastest Deployment (5 minutes)

**Option 1: Railway + Vercel (Recommended)**

1. **Deploy Backend to Railway**
   - Go to [Railway.app](https://railway.app)
   - Connect GitHub → Select repository → Choose `backend` folder
   - Add environment variables from `.env.example`

2. **Deploy Frontend to Vercel**
   - Go to [Vercel.com](https://vercel.com)
   - New Project → Select repository → Set root directory to `frontend`
   - Add `NEXT_PUBLIC_API_URL=your-railway-backend-url`

**Option 2: Heroku + Vercel**

```bash
# Backend to Heroku
cd backend
heroku create your-app-backend
heroku config:set NODE_ENV=production
# Add all environment variables...
git push heroku main

# Frontend to Vercel
cd ../frontend
vercel --prod
```

### 🐳 Docker Deployment (Local/VPS)

```bash
# Quick start with Docker
git clone your-repo
cd your-repo

# Linux/Mac
./deploy.sh local

# Windows
deploy.bat local

# Access at http://localhost:3000
```

### ☁️ Cloud Deployment

See detailed guides in [`backend/DEPLOYMENT_GUIDE.md`](backend/DEPLOYMENT_GUIDE.md)

## ⚙️ Required Setup

### 1. Environment Variables

Create `.env` file in project root:

```env
# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/luminpdf
MONGO_CLOUD_URI=mongodb+srv://user:pass@cluster.mongodb.net/luminpdf

# JWT Secrets
JWT_SECRET=your-super-secure-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-backend-domain.com/api/auth/google/callback

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_BUCKET_URL=https://your-bucket.s3.amazonaws.com

# Redis (optional for caching)
REDIS_URL=redis://your-redis-url:6379

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL
APP_URL=https://your-frontend-domain.com
FRONTEND_URL=https://your-frontend-domain.com

# Frontend environment
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

### 2. MongoDB Atlas Setup

1. Create [MongoDB Atlas](https://cloud.mongodb.com) account
2. Create cluster (M0 free tier available)
3. Create database user with readWrite permissions
4. Whitelist IP addresses (0.0.0.0/0 for testing)
5. Get connection string

### 3. AWS S3 Setup

1. Create S3 bucket
2. Create IAM user with S3 permissions
3. Get access key and secret key
4. Configure bucket policy for public read access

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized origins and redirect URIs

## 🧪 Test Before Deployment

```bash
# Test MongoDB Atlas connection
cd backend
npm run test:mongodb

# Test S3 connection
npm run test:s3

# Migrate to MongoDB Atlas (if needed)
npm run migrate:mongodb:dry-run
npm run migrate:mongodb:backup
```

## 📊 Recommended Stacks by Scale

| Scale | Frontend | Backend | Database | Cost/Month |
|-------|----------|---------|----------|------------|
| **Small** | Vercel Free | Railway $5 | Atlas Free | $5 |
| **Medium** | Vercel Pro $20 | DigitalOcean $25 | Atlas M10 $57 | $102 |
| **Large** | CloudFront $50 | ECS $200 | Atlas M30 $500+ | $750+ |

## 🚨 Quick Troubleshooting

**Connection Errors:**
- Check environment variables
- Verify MongoDB Atlas IP whitelist
- Test with `npm run test:mongodb`

**Build Errors:**
- Run `npm install` in both frontend and backend
- Check Node.js version (18+ required)
- Verify all required environment variables

**Authentication Issues:**
- Update Google OAuth redirect URLs
- Check JWT secrets are set
- Verify callback URLs match deployment domain

## 📚 Documentation Links

- **[Complete Deployment Guide](backend/DEPLOYMENT_GUIDE.md)** - Detailed deployment instructions
- **[MongoDB Migration Guide](backend/MIGRATION_TO_MONGODB_ATLAS.md)** - Database migration
- **[Environment Configuration](backend/.example.env)** - All required variables

## 🆘 Need Help?

1. Check the troubleshooting sections in documentation
2. Verify all environment variables are set correctly
3. Test individual components (database, S3, OAuth)
4. Check logs for specific error messages

---

**🎯 Goal:** Get LuminPDF deployed in under 10 minutes with Railway + Vercel! 