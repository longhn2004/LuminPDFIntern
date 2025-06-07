# LuminPDF Backend

A powerful NestJS-based backend API for PDF document management and collaboration platform. Built with modern technologies including MongoDB, Redis caching, AWS S3 storage, and comprehensive authentication system.

## 🚀 Features

- **Authentication System**
  - JWT-based authentication
  - Google OAuth integration
  - Email verification

- **Document Management**
  - PDF file upload and storage 
  - Google Drive file import
  - File sharing and collaboration
  - Role-based access control (Owner, Editor, Viewer)

- **Collaboration Features**
  - Annotations manipulating 
  - User invitations and notifications
  - Shareable links with access control

- **Performance & Scalability**
  - Redis caching for improved performance
  - Paginated file listings
  - Signed URLs for secure file access
  - Comprehensive error handling

- **Developer Experience**
  - Swagger API documentation
  - TypeScript support
  - Validation pipes

## 🛠 Technology Stack

- **Framework**: NestJS
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Upstack Redis
- **File Storage**: AWS S3
- **Authentication**: JWT + Passport.js + Google OAuth 2.0
- **Email**: Nodemailer
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator
- **Language**: TypeScript

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or cloud instance)
- Redis server
- AWS S3 bucket and credentials

## 🚦 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd LuminPDFIntern/backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the backend root directory:

```env
# Application Configuration
NODE_ENV=development
APP_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# MongoDB Configuration
MONGO_CLOUD_URI=mongodb+srv://username:password@cluster.mongodb.net/luminpdf
# OR for local MongoDB
MONGO_URI=mongodb://localhost:27017/luminpdf

# Redis Configuration (choose one approach)
# Option 1: Redis URL (for cloud Redis services like Redis Cloud, Upstash, etc.)
REDIS_URL=redis://username:password@host:port

# Option 2: Individual Redis configuration (for local or self-hosted Redis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TTL=300

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET_NAME=your-s3-bucket-name
AWS_S3_BUCKET_URL=your-s3-bucket-url

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Google Drive Integration (Service Account)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# Email Configuration (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Cookie Configuration (for production)
COOKIE_DOMAIN=.yourdomain.com
```

### 4. Setup External Services

#### MongoDB Setup
**Option A: MongoDB Atlas (Cloud)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get connection string and add to `MONGO_CLOUD_URI`

**Option B: Local MongoDB**
```bash
# Install MongoDB locally
# macOS
brew install mongodb-community

# Ubuntu
sudo apt install mongodb

# Start MongoDB service
mongod
```

#### Redis Setup
**Option A: Cloud Redis (Recommended for production)**
- [Redis Cloud](https://redis.com/redis-enterprise-cloud/)
- [Upstash](https://upstash.com/)
- Use the provided `REDIS_URL`

**Option B: Local Redis**
```bash
# Install Redis locally
# macOS
brew install redis

# Ubuntu
sudo apt install redis-server

# Start Redis service
redis-server
```

#### AWS S3 Setup
1. Create AWS account and S3 bucket
2. Create IAM user with S3 permissions:
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
                "s3:GetObjectVersion"
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

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)

#### Google Drive Integration (Optional)
1. In Google Cloud Console, enable Google Drive API
2. Create Service Account
3. Download JSON key file
4. Share folders with service account email
5. Set `GOOGLE_SERVICE_ACCOUNT_KEY` with JSON content

### 5. Run the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

The API will be available at `http://localhost:5000`

## 📚 API Documentation

Once the application is running, access the interactive API documentation:

- **Swagger UI**: `http://localhost:5000/api-docs`

### Authentication

The API uses JWT tokens for authentication. You can authenticate using:

1. **Bearer Token** in Authorization header
2. **HTTP-only Cookie** (automatically set by login endpoints)

### Main API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/verify-email` - Verify email address
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout user

#### File Management
- `POST /api/file/upload` - Upload PDF file
- `POST /api/file/upload-from-drive` - Import from Google Drive
- `GET /api/file/list` - List user files (paginated)
- `GET /api/file/:id/download` - Download file
- `GET /api/file/:id/info` - Get file information
- `DELETE /api/file/:id` - Delete file

#### Collaboration
- `POST /api/file/invite` - Invite users to file
- `POST /api/file/change-roles` - Change user multiple user role
- `GET /api/file/:id/users` - Get file users
- `GET /api/file/:id/user-role` - Get current user's role

#### Annotations
- `GET /api/file/:id/annotation` - Get file annotations
- `POST /api/file/:id/annotation/save` - Save annotations

#### Shareable Links
- `POST /api/file/shareable-link/create` - Create shareable link
- `GET /api/file/:id/shareable-links` - Get file's shareable links
- `PUT /api/file/shareable-link/toggle` - Enable/disable feature
- `DELETE /api/file/shareable-link/:linkId` - Delete link
- `POST /api/file/access-via-link` - Access file via link

## 🏗 Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── dto/             # Data transfer objects
│   ├── schemas/         # MongoDB schemas
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts
│   └── google.strategy.ts
├── file/                # File management module
│   ├── dto/             # Data transfer objects
│   ├── schemas/         # MongoDB schemas
│   ├── file.controller.ts
│   ├── file.service.ts
│   ├── file.module.ts
│   └── s3.service.ts
├── email/               # Email service module
│   ├── email.service.ts
│   └── email.module.ts
├── cache/               # Redis caching module
│   ├── cache.service.ts
│   └── cache.module.ts
├── config/              # Configuration utilities
│   └── google-credentials.ts
├── app.controller.ts    # Health check endpoints
├── app.service.ts
├── app.module.ts        # Main application module
├── main.ts             # Application entry point
├── polyfills.ts        # Node.js polyfills
└── swagger.config.ts   # API documentation config
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🔧 Development

### Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | No | `development` |
| `PORT` | Server port | No | `5000` |
| `APP_URL` | Frontend URL for CORS | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `MONGO_CLOUD_URI` | MongoDB connection string | Yes* | - |
| `REDIS_URL` | Redis connection URL | Yes* | - |
| `AWS_REGION` | AWS region | Yes | - |
| `AWS_ACCESS_KEY_ID` | AWS access key | Yes | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Yes | - |
| `AWS_S3_BUCKET_NAME` | S3 bucket name | Yes | - |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Yes | - |
| `EMAIL_HOST` | SMTP host | Yes | - |
| `EMAIL_USER` | SMTP username | Yes | - |
| `EMAIL_PASS` | SMTP password | Yes | - |

*Either `MONGO_CLOUD_URI` or local MongoDB, either `REDIS_URL` or local Redis config required.

### Cache Keys Pattern

The application uses structured cache keys:
- `file_info:{fileId}` - File metadata
- `user_files:{userId}:{page}:{sort}` - User file lists
- `user_file_role:{fileId}:{userId}` - User permissions
- `file_users:{fileId}` - File collaborators
- `file_annotations:{fileId}` - File annotations

### Database Schema

#### Users Collection
```javascript
{
  email: String (unique),
  password: String (hashed),
  googleId: String,
  name: String,
  isEmailVerified: Boolean,
  verificationToken: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Files Collection
```javascript
{
  name: String,
  path: String (S3 key),
  owner: ObjectId,
  ownerEmail: String (indexed),
  viewers: [String],
  editors: [String],
  xfdf: String (annotations),
  version: Number,
  shareableLinkEnabled: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Deployment

### Production Environment Variables

```env
NODE_ENV=production
APP_URL=https://yourdomain.com
COOKIE_DOMAIN=.yourdomain.com
```

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "run", "start:prod"]
```

### Health Checks

The application provides health check endpoints:
- `GET /` - Basic health check
- `GET /health` - Detailed health information
- `GET /cache/test` - Redis cache test

## 🔍 Monitoring and Debugging

### Logging

The application uses comprehensive logging:
- Console logs with emojis for easy identification
- Error tracking with stack traces
- Performance monitoring for cache hits/misses
- Database operation logging

### Cache Testing

Test cache functionality:
```bash
curl http://localhost:5000/cache/test
```

### Google Drive Testing

Test Google credentials:
```bash
curl http://localhost:5000/api/file/google/test-credentials
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```
   Error: ENOTFOUND cluster0.mongodb.net
   ```
   - Check MongoDB URI format
   - Verify network access and IP whitelist
   - Ensure credentials are correct

2. **Redis Connection Failed**
   ```
   Error: Redis connection refused
   ```
   - Verify Redis server is running
   - Check Redis URL/host configuration
   - Ensure Redis accepts connections

3. **AWS S3 Access Denied**
   ```
   Error: Access Denied
   ```
   - Verify AWS credentials
   - Check S3 bucket permissions
   - Ensure bucket name is correct

4. **Google OAuth Error**
   ```
   Error: redirect_uri_mismatch
   ```
   - Check Google OAuth redirect URIs
   - Verify client ID and secret
   - Ensure proper domain configuration

### Getting Help

- Check the [Issues](../../issues) section
- Review API documentation at `/api-docs`
- Enable debug logging: `DEBUG=* npm run start:dev`
