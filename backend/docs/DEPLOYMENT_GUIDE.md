# LuminPDF Deployment Guide

This guide covers multiple deployment strategies for your LuminPDF application, from simple hosting to production-ready setups.

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Quick Deployment (Recommended)](#quick-deployment-recommended)
4. [Production Deployment](#production-deployment)
5. [Alternative Deployment Options](#alternative-deployment-options)
6. [Environment Configuration](#environment-configuration)
7. [Post-Deployment Setup](#post-deployment-setup)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

## 🏗️ Project Overview

Your LuminPDF application consists of:

### Backend (NestJS)
- **Framework**: NestJS with TypeScript
- **Database**: MongoDB (local) → MongoDB Atlas (cloud)
- **File Storage**: AWS S3
- **Cache**: Redis
- **Authentication**: JWT + Google OAuth
- **Email**: SMTP (configurable)
- **Port**: 5000 (configurable)

### Frontend (Next.js)
- **Framework**: Next.js with React
- **UI**: Modern React components
- **Authentication**: Integrated with backend
- **File Viewer**: PDF viewing and annotation
- **Port**: 3000 (configurable)

### External Services
- **MongoDB Atlas**: Cloud database
- **AWS S3**: File storage
- **Redis**: Caching (can be cloud or local)
- **Google OAuth**: Authentication provider
- **SMTP**: Email service

## ✅ Pre-Deployment Checklist

### 1. Database Migration
- [ ] MongoDB migrated to Atlas (if not done)
- [ ] All data verified in cloud database
- [ ] Connection strings updated

### 2. File Storage
- [ ] AWS S3 bucket configured
- [ ] Files migrated to S3 (if applicable)
- [ ] S3 permissions verified

### 3. Environment Variables
- [ ] All required environment variables configured
- [ ] Sensitive data secured
- [ ] Production URLs set

### 4. Code Preparation
- [ ] All dependencies installed
- [ ] Code built and tested locally
- [ ] No console.log statements in production code

## 🚀 Quick Deployment (Recommended)

This is the fastest way to get your application online using modern platforms.

### Option A: Railway (Recommended for Full-Stack)

Railway is excellent for full-stack applications with databases.

#### Step 1: Prepare Your Project

```bash
# In your project root, create a Procfile
echo "web: npm run start:prod" > backend/Procfile
echo "web: npm start" > frontend/Procfile
```

#### Step 2: Deploy Backend to Railway

1. Go to [Railway](https://railway.app)
2. Sign in with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your repository
5. Choose **"backend"** folder
6. Configure environment variables (see [Environment Configuration](#environment-configuration))

#### Step 3: Deploy Frontend to Vercel

1. Go to [Vercel](https://vercel.com)
2. Sign in with GitHub
3. Click **"New Project"**
4. Select your repository
5. Set **Root Directory** to `frontend`
6. Configure environment variables (NEXT_PUBLIC_API_URL to your Railway backend URL)

### Option B: Heroku + Vercel

#### Backend on Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create Heroku app
cd backend
heroku create your-app-name-backend

# Set buildpack
heroku buildpacks:set heroku/nodejs

# Configure environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGO_URI=your_mongodb_atlas_connection_string
heroku config:set JWT_SECRET=your_jwt_secret
# Add all other environment variables...

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main

# Scale the app
heroku ps:scale web=1
```

#### Frontend on Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel

# Follow the prompts and set environment variables
```

## 🏭 Production Deployment

For production environments requiring more control and scalability.

### Option 1: AWS ECS + RDS + CloudFront

This is a fully managed, scalable AWS solution.

#### Architecture
```
Internet → CloudFront → ALB → ECS (Backend) → RDS/MongoDB Atlas
                     → S3 (Frontend) → S3 (Files)
```

#### Step 1: Backend Container

Create `backend/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]
```

#### Step 2: Frontend Container

Create `frontend/Dockerfile`:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

EXPOSE 3000
CMD ["npm", "start"]
```

#### Step 3: Docker Compose for Local Testing

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=${MONGO_URI}
      - JWT_SECRET=${JWT_SECRET}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:5000
    depends_on:
      - backend

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Option 2: DigitalOcean App Platform

DigitalOcean App Platform is great for medium-scale applications.

#### Step 1: Create App Spec

Create `.do/app.yaml`:
```yaml
name: luminpdf
services:
- name: backend
  source_dir: /backend
  github:
    repo: your-username/your-repo
    branch: main
  run_command: npm run start:prod
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  env:
  - key: NODE_ENV
    value: production
  - key: MONGO_URI
    value: ${MONGO_URI}
    type: SECRET
  - key: JWT_SECRET
    value: ${JWT_SECRET}
    type: SECRET

- name: frontend
  source_dir: /frontend
  github:
    repo: your-username/your-repo
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  env:
  - key: NEXT_PUBLIC_API_URL
    value: ${backend.PUBLIC_URL}

databases:
- name: redis
  engine: REDIS
  version: "7"
```

### Option 3: Google Cloud Run

Serverless container deployment with automatic scaling.

#### Step 1: Build and Deploy Backend

```bash
# Set project
gcloud config set project your-project-id

# Build and push to Container Registry
cd backend
gcloud builds submit --tag gcr.io/your-project-id/luminpdf-backend

# Deploy to Cloud Run
gcloud run deploy luminpdf-backend \
  --image gcr.io/your-project-id/luminpdf-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi
```

#### Step 2: Deploy Frontend

```bash
cd frontend
gcloud builds submit --tag gcr.io/your-project-id/luminpdf-frontend

gcloud run deploy luminpdf-frontend \
  --image gcr.io/your-project-id/luminpdf-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## 🔧 Environment Configuration

### Backend Environment Variables

```env
# Production Environment
NODE_ENV=production
PORT=5000

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/luminpdf
MONGO_CLOUD_URI=mongodb+srv://username:password@cluster.mongodb.net/luminpdf

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-s3-bucket-name
AWS_S3_BUCKET_URL=https://your-s3-bucket-name.s3.amazonaws.com

# Redis
REDIS_URL=redis://your-redis-url:6379
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TTL=300

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# App URL
APP_URL=https://your-frontend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend Environment Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend-domain.com

# App Configuration
NEXT_PUBLIC_APP_NAME=LuminPDF
NEXT_PUBLIC_APP_URL=https://your-frontend-domain.com

# Google OAuth (for frontend)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

## 📊 Alternative Deployment Options

### Self-Hosted VPS (Ubuntu/CentOS)

For complete control over your infrastructure.

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx

# Install Redis
sudo apt install redis-server
```

#### Step 2: Deploy Backend

```bash
# Clone repository
git clone your-repo-url
cd your-repo/backend

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'luminpdf-backend',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Step 3: Deploy Frontend

```bash
cd ../frontend
npm ci
npm run build

# Create PM2 config for frontend
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'luminpdf-frontend',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

pm2 start ecosystem.config.js
```

#### Step 4: Configure Nginx

```nginx
# /etc/nginx/sites-available/luminpdf
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/luminpdf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 5: SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔒 Post-Deployment Setup

### 1. Domain Configuration

#### Custom Domain Setup
1. Purchase domain from registrar (Namecheap, GoDaddy, etc.)
2. Point DNS to your deployment:
   - **Railway/Heroku**: Add CNAME record
   - **Vercel**: Add A record or CNAME
   - **VPS**: Add A record pointing to server IP

#### SSL Certificate
- Most platforms provide automatic SSL
- For VPS: Use Let's Encrypt (shown above)

### 2. Google OAuth Configuration

Update Google Cloud Console:
```
Authorized Origins:
- https://your-domain.com
- https://your-backend-domain.com

Authorized Redirect URIs:
- https://your-backend-domain.com/api/auth/google/callback
```

### 3. Database Security

#### MongoDB Atlas
- Remove `0.0.0.0/0` from IP whitelist
- Add specific server IP addresses
- Enable database auditing
- Set up monitoring alerts

### 4. AWS S3 Security

Update S3 bucket policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RestrictToApplication",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR-ACCOUNT:user/luminpdf-user"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

## 📈 Monitoring and Maintenance

### Application Monitoring

#### Health Check Endpoints

Add to backend (`src/app.controller.ts`):
```typescript
@Get('health')
healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version
  };
}
```

#### Performance Monitoring

**Free Options:**
- **UptimeRobot**: Uptime monitoring
- **LogRocket**: Frontend monitoring
- **Sentry**: Error tracking

**Paid Options:**
- **New Relic**: Full-stack monitoring
- **DataDog**: Infrastructure monitoring
- **AWS CloudWatch**: AWS-native monitoring

### Backup Strategy

#### Database Backups
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="your-mongodb-uri" --out="backup_$DATE"
aws s3 cp "backup_$DATE" s3://your-backup-bucket/ --recursive
rm -rf "backup_$DATE"
```

#### File Backups
- S3 versioning enabled
- Cross-region replication
- Lifecycle policies for cost optimization

### Scaling Considerations

#### Horizontal Scaling
- Use load balancers
- Container orchestration (Kubernetes)
- Microservices architecture

#### Database Scaling
- MongoDB Atlas auto-scaling
- Read replicas
- Sharding for large datasets

## 🚨 Troubleshooting

### Common Deployment Issues

#### Environment Variables
```bash
# Check if variables are loaded
echo $NODE_ENV
echo $MONGO_URI
```

#### Port Issues
```bash
# Check what's running on ports
netstat -tulpn | grep :5000
netstat -tulpn | grep :3000
```

#### Memory Issues
```bash
# Monitor memory usage
free -h
htop
```

#### Database Connection
```bash
# Test MongoDB connection
mongosh "your-mongodb-uri"
```

#### Redis Connection
```bash
# Test Redis connection
redis-cli -u "your-redis-url" ping
```

### Logs and Debugging

#### Application Logs
```bash
# PM2 logs
pm2 logs

# Container logs
docker logs container-name

# Heroku logs
heroku logs --tail

# Railway logs
railway logs
```

#### Error Tracking

Set up Sentry for error monitoring:
```bash
npm install @sentry/node @sentry/tracing
```

## 🎯 Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database migrated to cloud
- [ ] File storage configured (S3)
- [ ] SSL certificates ready
- [ ] Domain DNS configured
- [ ] Google OAuth URLs updated

### Deployment
- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Database connectivity verified
- [ ] File upload/download working
- [ ] Authentication working
- [ ] Email notifications working

### Post-Deployment
- [ ] Health checks configured
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Performance testing completed
- [ ] Security review completed
- [ ] Documentation updated

## 📚 Quick Reference

### Recommended Stack for Different Scales

| Scale | Frontend | Backend | Database | Monitoring |
|-------|----------|---------|----------|------------|
| **Small** | Vercel | Railway | MongoDB Atlas Free | UptimeRobot |
| **Medium** | Vercel | DigitalOcean | MongoDB Atlas M10 | Sentry + LogRocket |
| **Large** | CloudFront | ECS/GKE | MongoDB Atlas M30+ | New Relic + DataDog |

### Cost Estimates (Monthly)

| Component | Small | Medium | Large |
|-----------|-------|--------|-------|
| Frontend | Free | $20 | $100 |
| Backend | $5 | $25 | $200 |
| Database | Free | $57 | $500+ |
| Storage | $5 | $20 | $100+ |
| **Total** | **$10** | **$122** | **$900+** |

---

**Need Help?** Check the troubleshooting section or create an issue in your repository for deployment-specific questions. 