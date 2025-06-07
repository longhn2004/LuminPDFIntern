# LuminPDF API Documentation

## Overview

LuminPDF provides a comprehensive REST API for PDF document management, collaboration, and annotation. The API is built with NestJS and uses JWT-based authentication.

## 📚 Interactive API Documentation

The complete API documentation is available via Swagger UI when the application is running:

- **Local Development**: http://localhost:5000/api-docs
- **Production**: https://api.luminpdf.com/api-docs

The Swagger documentation includes:
- Complete endpoint documentation
- Request/response schemas
- Authentication requirements
- Interactive testing interface
- Code examples

## 🔑 Authentication

The API supports two authentication methods:

### 1. JWT Bearer Token
Add the token to the Authorization header:
```
Authorization: Bearer <jwt-token>
```

### 2. HTTP-Only Cookie
Automatically set by login endpoints. The cookie name is `access_token`.

## 📁 API Endpoints Overview

### Authentication (`/api/auth`)
- `POST /register` - Register a new user
- `POST /login` - Login with email/password
- `GET /google` - Initiate Google OAuth flow
- `GET /google/callback` - Handle Google OAuth callback
- `GET /verify-email` - Verify email address
- `POST /resend-verification` - Resend verification email
- `GET /profile` - Get user profile
- `GET /me` - Get current user details
- `GET /user-by-email` - Get user by email
- `POST /logout` - Logout user

### File Management (`/api/file`)
- `POST /upload` - Upload PDF file
- `POST /upload-from-drive` - Upload from Google Drive
- `GET /list` - List user files (paginated)
- `GET /total-files` - Get total file count
- `GET /:id/download` - Download file
- `GET /:id/download-with-annotations` - Download with annotations
- `GET /:id/info` - Get file information
- `DELETE /:id` - Delete file

### Collaboration
- `POST /invite` - Invite users to file
- `POST /change-role` - Change user role
- `POST /change-roles` - Bulk change roles
- `GET /:id/users` - Get file users
- `GET /:id/user-role` - Get user role for file

### Annotations
- `GET /:id/annotation` - Get file annotations
- `POST /:id/annotation/save` - Save annotations

### Shareable Links
- `POST /shareable-link/create` - Create shareable link
- `GET /:id/shareable-links` - Get file shareable links
- `DELETE /shareable-link/:linkId` - Delete shareable link
- `PUT /shareable-link/toggle` - Toggle shareable link feature
- `POST /access-via-link` - Access file via link

### Health & Monitoring
- `GET /` - Basic health check
- `GET /health` - Detailed health check
- `GET /cache/test` - Test Redis cache

## 🔒 Authorization Levels

### File Roles
- **Owner**: Full access (read, write, delete, share)
- **Editor**: Read and write access, can save annotations
- **Viewer**: Read-only access

### Shareable Links
- Create temporary access without permanent role assignment
- Support viewer and editor access levels
- Can be enabled/disabled per file

## 📄 Request/Response Format

### Success Response
```json
{
  "data": "...",
  "message": "Success message"
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

## 📊 Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no content returned
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., email already exists)
- `500 Internal Server Error` - Server error

## 🎯 Quick Start Examples

### 1. Register and Login
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### 2. Upload a File
```bash
curl -X POST http://localhost:5000/api/file/upload \
  -H "Authorization: Bearer <jwt-token>" \
  -F "file=@document.pdf"
```

### 3. List Files
```bash
curl -X GET "http://localhost:5000/api/file/list?page=0&sort=DESC" \
  -H "Authorization: Bearer <jwt-token>"
```

### 4. Share a File
```bash
curl -X POST http://localhost:5000/api/file/invite \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"fileId":"507f1f77bcf86cd799439011","emails":["collaborator@example.com"],"role":"editor"}'
```

## 🔧 Development

### Running Locally
```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Access Swagger documentation
open http://localhost:5000/api-docs
```

### Environment Variables
Key environment variables for API functionality:
- `JWT_SECRET` - JWT signing secret
- `MONGO_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection URL
- `AWS_ACCESS_KEY_ID` - AWS S3 access key
- `AWS_SECRET_ACCESS_KEY` - AWS S3 secret key
- `AWS_S3_BUCKET_NAME` - S3 bucket name
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

## 📝 API Testing

### Using Swagger UI
1. Navigate to `/api-docs`
2. Click "Authorize" to add your JWT token
3. Test endpoints directly in the browser

### Using Postman
Import the OpenAPI specification from `/api-docs-json` into Postman for a complete collection.

### Using curl
All examples in this documentation use curl for easy testing.

## 🆘 Support

For API support or questions:
- Email: support@luminpdf.com
- Documentation: https://docs.luminpdf.com
- GitHub Issues: https://github.com/luminpdf/api/issues

## 📚 Additional Resources

- [API Changelog](./CHANGELOG.md)
- [Authentication Guide](./docs/authentication.md)
- [File Upload Guide](./docs/file-upload.md)
- [Collaboration Features](./docs/collaboration.md) 