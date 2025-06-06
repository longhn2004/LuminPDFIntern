import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('LuminPDF API')
  // .setDescription(`
  //   ## LuminPDF - PDF Document Management and Collaboration Platform

  //   This API provides comprehensive endpoints for managing PDF documents, user authentication, and collaboration features.

  //   ### Features:
  //   - **Authentication**: JWT-based authentication with email/password and Google OAuth
  //   - **File Management**: Upload, download, and manage PDF files
  //   - **Collaboration**: Share files with specific roles (viewer/editor)
  //   - **Annotations**: Save and retrieve PDF annotations in XFDF format
  //   - **Shareable Links**: Create time-limited links for file access
  //   - **Caching**: Redis-based caching for improved performance
  //   - **Cloud Storage**: AWS S3 integration for file storage

  //   ### Authentication:
  //   Most endpoints require authentication. You can authenticate using:
  //   1. **JWT Bearer Token** in the Authorization header
  //   2. **HTTP-only Cookie** (access_token) set by login endpoints

  //   ### Error Responses:
  //   The API uses standard HTTP status codes and returns error responses in the following format:
  //   \`\`\`json
  //   {
  //     "statusCode": 400,
  //     "message": "Error description",
  //     "error": "Bad Request"
  //   }
  //   \`\`\`

  //   ### File Roles:
  //   - **Owner**: Full access (read, write, delete, share)
  //   - **Editor**: Read and write access, can save annotations
  //   - **Viewer**: Read-only access

  //   ### Pagination:
  //   List endpoints support pagination with the following parameters:
  //   - \`page\`: Page number (0-based)
  //   - \`sort\`: Sort order (ASC/DESC)
  // `)
  // .setVersion('1.0.0')
  // .setContact(
  //   'LuminPDF Support',
  //   'https://luminpdf.com',
  //   'support@luminpdf.com'
  // )
  // .setLicense(
  //   'MIT',
  //   'https://opensource.org/licenses/MIT'
  // )
  .addServer('http://localhost:5000', 'Development Server')
  .addServer('https://luminpdfintern.onrender.com', 'Production Server')
  .addTag('auth', 'Authentication and user management endpoints')
  .addTag('file', 'File upload, download, and management endpoints')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token (received from login endpoints)',
      in: 'header',
    },
    'JWT-auth'
  )
  .addCookieAuth('access_token', {
    type: 'apiKey',
    in: 'cookie',
    name: 'access_token',
    description: 'JWT token stored in HTTP-only cookie (automatically set by login endpoints)',
  })
  .build();

export const swaggerOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
  customSiteTitle: 'LuminPDF API Documentation',
  customCss: `
    .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #2c3e50; }
    .swagger-ui .info .description { font-size: 14px; line-height: 1.6; }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 4px; }
  `,
  customfavIcon: '/favicon.ico',
}; 