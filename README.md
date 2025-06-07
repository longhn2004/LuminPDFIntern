# LuminPDF - PDF Collaboration Platform

A modern, full-stack PDF document management and collaboration platform built with cutting-edge technologies. LuminPDF enables teams to upload, view, annotate, and collaborate on PDF documents with robust sharing and permission management.

## 🌟 Overview

LuminPDF is a comprehensive solution consisting of:

- **Frontend**: Modern Next.js 14 application with TypeScript, Redux Toolkit, and PDFTron WebViewer
- **Backend**: Robust NestJS API with MongoDB, Redis caching, and AWS S3 storage
- **Collaboration**: Multi-user PDF annotation and editing capabilities
- **Advanced Features**: Role-based access control, shareable links, and user management

## 🚀 Key Features

### 📄 **PDF Management**
- Upload PDF files
- Import files directly from Google Drive
- High-quality PDF rendering with zoom and navigation controls
- Download original PDFs or PDFs with embedded annotations

### ✏️ **Collaboration**
- Multi-user annotation and editing
- Drawing tools (rectangle, circle, arrow, line)
- Text annotations and free text
- Color customization and styling options
- Auto-save functionality

### 👥 **User Management & Sharing**
- Role-based access control (Owner, Editor, Viewer)
- User invitations via email
- Shareable links with permission controls
- User presence indicators during collaboration

### 🔐 **Authentication & Security**
- JWT-based authentication with automatic refresh
- Google OAuth integration
- Email verification system
- Secure file storage with signed URLs

### 🌍 **Modern User Experience**
- Internationalization support (English, Vietnamese)
- Loading states and error handling
- Toast notifications

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   External      │
│   (Next.js)     │    │   (NestJS)      │    │   Services      │
│                 │    │                 │    │                 │
│ • React 18      │◄──►│ • MongoDB       │◄──►│ • AWS S3        │
│ • TypeScript    │    │ • Redis Cache   │    │ • Google OAuth  │
│ • Redux Toolkit │    │ • JWT Auth      │    │ • MongoDB Atlas │
│ • PDFTron       │    │ • Swagger API   │    │ • Upstack cache │
│ • Tailwind CSS  │    │ • WebSockets    │    │ • SMTP Email    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠 Technology Stack

### Frontend Technologies
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS
- **PDF Viewer**: PDFTron WebViewer
- **HTTP Client**: Axios
- **Internationalization**: next-intl
- **Notifications**: React Toastify

### Backend Technologies
- **Framework**: NestJS
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis
- **File Storage**: AWS S3
- **Authentication**: JWT + Passport.js
- **Email**: Nodemailer
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator

## 📋 Prerequisites

Before setting up the project, ensure you have:

- **Node.js** (v18 or higher)
- **npm, yarn, or pnpm**
- **MongoDB** (local or cloud instance)
- **Redis** server
- **AWS S3** bucket and credentials
- **Google OAuth** credentials
- **PDFTron WebViewer** license (for production)

## 🚦 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd LuminPDFIntern
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

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

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create `frontend/.env.local`:

```env
# Application Configuration
NEXT_APP_FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Backend API Configuration
NEXT_APP_BACKEND_URL=http://localhost:5000/api

# PDFTron WebViewer Configuration
NEXT_APP_PDFTRON_LICENSE_KEY=your-webviewer-license-key
```

### 4. Setup PDFTron WebViewer

Download WebViewer from [PDFTron](https://www.pdftron.com/webviewer/) and extract to `frontend/public/webviewer/`

### 5. Start Development Servers

```bash
# Terminal 1: Start Backend
cd backend
npm run start:dev

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

Access the application:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **API Documentation**: `http://localhost:5000/api-docs`

## 🏗 Project Structure

```
LuminPDFIntern/
├── frontend/                     # Next.js Frontend Application
│   ├── app/                     # Next.js App Router
│   │   ├── api/                # API routes (proxy to backend)
│   │   ├── auth/               # Authentication pages
│   │   ├── dashboard/          # Dashboard and document management
│   │   └── share/              # Shared document access
│   ├── components/             # Reusable React components
│   │   ├── auth/              # Authentication components
│   │   ├── document-list/     # Document management components
│   │   ├── viewpdf/                 # PDF Viewer components
│   │   └── share/             # Sharing and collaboration components
│   ├── hooks/                 # Custom React hooks
│   ├── libs/                  # Utility libraries and API clients
│   ├── redux/                 # Redux store and state management
│   ├── types/                 # TypeScript type definitions
│   └── messages/              # Internationalization messages
├── backend/                     # NestJS Backend API
│   ├── src/
│   │   ├── auth/              # Authentication module
│   │   ├── file/              # File management module
│   │   ├── email/             # Email service module
│   │   ├── cache/             # Redis caching module
│   │   └── config/            # Configuration utilities
│   ├── docs/                  # API documentation
│   └── scripts/               # Utility scripts
├── deploy.sh                   # Deployment script
├── deploy.bat                  # Windows deployment script
├── docker-compose.yml          # Docker composition
├── nginx.conf                  # Nginx configuration
└── DEPLOYMENT_README.md        # Deployment instructions
```

## 🎯 Core Features Deep Dive

### Authentication System

**Registration & Login**
- Email/password authentication with bcrypt hashing
- Google OAuth integration for quick signup
- Email verification required for new accounts
- JWT tokens with automatic refresh mechanism

**Security Features**
- HTTP-only cookies for token storage
- CSRF protection and XSS prevention
- Role-based access control
- Secure password reset flow

### PDF Document Management

**File Operations**
- Secure file upload with validation
- AWS S3 storage with signed URLs for secure access
- Google Drive integration for importing files
- Automatic file versioning and metadata tracking

**Viewing & Navigation**
- High-quality PDF rendering with PDFTron WebViewer
- Zoom controls (fit-to-page, fit-to-width, custom zoom)
- Page navigation and full-screen mode

### Collaboration

**Annotation Tools**
- Text annotations with customizable styling
- Drawing tools: rectangle, circle, arrow, line
- Free text annotations with font customization
- Color picker with transparency options

**Permission Management**
- Three role levels: Owner, Editor, Viewer
- Granular permission controls
- User invitation system via email
- Shareable links with configurable access levels

### Performance & Scalability

**Caching Strategy**
- Redis caching for file metadata and user permissions
- Cached file lists with pagination support
- Annotation caching for faster load times
- Smart cache invalidation on updates

**Optimization Features**
- Lazy loading for large file lists
- Code splitting and bundle optimization
- Image optimization and WebP support
- Database query optimization with indexes

## 🔧 Configuration Guide

### External Services Setup

#### MongoDB Atlas (Cloud Database)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Configure network access and database user
4. Get connection string for `MONGO_CLOUD_URI`

#### Redis Cloud (Caching)
1. Sign up at [Redis Cloud](https://redis.com/redis-enterprise-cloud/)
2. Create a new database
3. Get connection URL for `REDIS_URL`

#### AWS S3 (File Storage)
1. Create AWS account and S3 bucket
2. Create IAM user with S3 permissions
3. Configure bucket CORS for frontend access
4. Set environment variables for AWS credentials

#### Google OAuth (Authentication)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project and enable Google+ API
3. Create OAuth 2.0 credentials
4. Configure authorized redirect URIs

#### PDFTron WebViewer (PDF Rendering)
1. Sign up at [PDFTron](https://www.pdftron.com/)
2. Download WebViewer package
3. Extract files to `frontend/public/webviewer/`
4. Get license key for production use

## 🧪 Testing

### Backend Testing
```bash
cd backend

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Frontend Testing
```bash
cd frontend

# Run tests
npm run test

# Test with coverage
npm run test:coverage

# Type checking
npm run type-check
```

## 🚀 Deployment

### Production Environment Setup

#### Environment Variables

**Backend (`backend/.env`)**
```env
NODE_ENV=production
APP_URL=https://yourdomain.com
COOKIE_DOMAIN=.yourdomain.com
# ... other production values
```

**Frontend (`frontend/.env.local`)**
```env
NODE_ENV=production
NEXT_APP_FRONTEND_URL=https://yourdomain.com
NEXT_APP_BACKEND_URL=https://api.yourdomain.com/api
NEXT_APP_PDFTRON_LICENSE_KEY=your-production-license
```

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build

# Start production servers
npm run start
```

### Nginx Configuration

Use the provided `nginx.conf` for reverse proxy setup:
- Frontend served on port 80/443
- Backend API proxied to `/api` path
- Static files served efficiently
- SSL termination and security headers

## 🔍 API Documentation

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/verify-email` - Email verification

#### File Management
- `POST /api/file/upload` - Upload PDF file
- `GET /api/file/list` - List user files
- `GET /api/file/:id/download` - Download file
- `DELETE /api/file/:id` - Delete file

#### Collaboration
- `POST /api/file/invite` - Invite users
- `POST /api/file/change-role` - Change permissions
- `GET /api/file/:id/annotation` - Get annotations
- `POST /api/file/:id/annotation/save` - Save annotations

#### Sharing
- `POST /api/file/shareable-link/create` - Create shareable link
- `POST /api/file/access-via-link` - Access via link

**Complete API documentation available at**: `http://localhost:5000/api-docs`

## 🐛 Troubleshooting

### Common Issues

1. **WebViewer Loading Issues**
   - Ensure WebViewer files are in `frontend/public/webviewer/`
   - Check license key configuration
   - Verify file permissions

2. **Database Connection Failed**
   - Check MongoDB URI and credentials
   - Verify network access and IP whitelist
   - Test connection with MongoDB Compass

3. **Redis Connection Issues**
   - Verify Redis server is running
   - Check connection URL format
   - Test with Redis CLI

4. **File Upload Failures**
   - Verify AWS S3 credentials and permissions
   - Check bucket CORS configuration
   - Ensure file size limits

5. **Authentication Errors**
   - Verify Google OAuth configuration
   - Check JWT secret and expiration
   - Clear browser cookies and try again

### Debug Mode
```bash
# Backend debug
cd backend
DEBUG=* npm run start:dev

# Frontend debug
cd frontend
npm run dev
```

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make changes and test**
   ```bash
   # Test backend
   cd backend && npm run test
   
   # Test frontend
   cd frontend && npm run test
   ```
4. **Commit with conventional format**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
5. **Push and create Pull Request**

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Consistent code style
- **Prettier**: Automatic code formatting
- **Husky**: Pre-commit hooks for quality
- **Conventional Commits**: Structured commit messages

### Component Guidelines

1. **Backend**: Follow NestJS best practices
2. **Frontend**: Use React functional components with hooks
3. **Testing**: Write tests for critical functionality
4. **Documentation**: Update README for new features
5. **Security**: Follow OWASP guidelines

## 📚 Learning Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [PDFTron WebViewer](https://www.pdftron.com/documentation/web/)
- [MongoDB Atlas](https://docs.atlas.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)

### Tutorials
- [Next.js Learn](https://nextjs.org/learn)
- [NestJS Fundamentals](https://docs.nestjs.com/first-steps)
- [Redux Toolkit](https://redux-toolkit.js.org/tutorials/quick-start)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Getting Help

### Support Channels
- **Documentation**: Check component READMEs and inline comments
- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for questions
- **API Documentation**: Interactive docs at `/api-docs`

### Debug Information

When reporting issues, please include:
- Environment details (Node.js, browser versions)
- Console error messages and network failures
- Steps to reproduce the issue
- Configuration details (without sensitive data)

## 🎉 Getting Started Checklist

### Initial Setup
- [ ] Clone repository
- [ ] Install Node.js and npm
- [ ] Setup MongoDB and Redis
- [ ] Configure AWS S3 bucket
- [ ] Setup Google OAuth credentials
- [ ] Download PDFTron WebViewer

### Backend Setup
- [ ] Install backend dependencies
- [ ] Configure environment variables
- [ ] Test database connections
- [ ] Start development server
- [ ] Verify API documentation

### Frontend Setup
- [ ] Install frontend dependencies
- [ ] Setup WebViewer files
- [ ] Configure environment variables
- [ ] Start development server
- [ ] Test authentication flow

### Integration Testing
- [ ] Test user registration and login
- [ ] Upload and view PDF files
- [ ] Test annotation features
- [ ] Verify sharing functionality
- [ ] Test responsive design

---

**Ready to revolutionize PDF collaboration?** 🚀

Get started with LuminPDF and experience the future of document collaboration!
