# LuminPDF Frontend

A modern, responsive Next.js frontend application for PDF document management and collaboration. Built with cutting-edge technologies including Next.js 14, TypeScript, Redux Toolkit, and WebViewer for seamless PDF viewing and annotation capabilities.

## 🚀 Features

- **Modern Architecture**
  - Next.js 14 with App Router
  - TypeScript for type safety
  - Server-side rendering (SSR)
  - API routes for backend integration

- **Authentication System**
  - JWT-based authentication
  - Google OAuth integration
  - Email verification flow
  - Token expiration handling

- **PDF Management**
  - Advanced PDF viewer with WebViewer
  - Editing annotations and collaboration
  - File upload
  - Google Drive integration
  - Download with annotations

- **Collaboration Features**
  - Role-based access control (Owner, Editor, Viewer)
  - User invitations and notifications
  - Shareable links with permissions

- **User Experience**
  - Internationalization (i18n) support
  - Loading states and error handling
  - Toast notifications

- **Performance & Optimization**
  - Server-side rendering
  - Code splitting and lazy loading
  - Optimized bundle size
  - Image optimization

## 🛠 Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS
- **PDF Viewer**: PDFTron WebViewer
- **Authentication**: JWT + Google OAuth
- **HTTP Client**: Axios
- **Internationalization**: next-intl
- **UI Components**: Custom components with Tailwind
- **Icons**: React Icons
- **Notifications**: React Toastify

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- npm, yarn, or pnpm
- Access to LuminPDF backend API
- PDFTron WebViewer license (for production)

## 🚦 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd LuminPDFIntern/frontend
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm
pnpm install
```

### 3. Environment Configuration

Create a `.env.local` file in the frontend root directory:

```env
# Application Configuration
NEXT_APP_FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Backend API Configuration
NEXT_APP_BACKEND_URL=http://localhost:5000/api

# PDFTron WebViewer Configuration
NEXT_APP_PDFTRON_LICENSE_KEY=your-webviewer-license-key

# Internationalization
NEXT_LOCALE=en
```

### 4. Setup PDFTron WebViewer

#### Option A: Download WebViewer Files
1. Download WebViewer from [PDFTron](https://www.pdftron.com/webviewer/)
2. Extract the WebViewer files to `public/webviewer/`
3. Ensure the following structure:
```
public/
├── webviewer/
│   ├── core/
│   ├── ui/
│   ├── webviewer.min.js
│   └── ...other WebViewer files
```

#### Option B: CDN Setup (Development)
For development, you can use the trial version from CDN by updating the script loading logic in the WebViewer components.

### 5. Run the Development Server

```bash
# Using npm
npm run dev

# Using yarn  
yarn dev

# Using pnpm
pnpm dev

# Using bun
bun dev
```

The application will be available at `http://localhost:3000`

## 🔧 Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Frontend application URL | Yes | - |
| `NEXT_PUBLIC_BACKEND_URL` | Backend API base URL | Yes | - |
| `NEXT_APP_BACKEND_URL` | Backend URL for server-side requests | Yes | - |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes | - |
| `NEXT_PUBLIC_WEBVIEWER_LICENSE_KEY` | PDFTron WebViewer license | No* | - |
| `NEXT_LOCALE` | Default locale | No | `en` |
| `NODE_ENV` | Environment mode | No | `development` |

*Required for production deployment

## 🏗 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                     # API routes (proxy to backend)
│   │   ├── auth/               # Authentication endpoints
│   │   └── file/               # File management endpoints
│   ├── auth/                   # Authentication pages
│   │   ├── signin/
│   │   ├── signup/
│   │   ├── verify-email/
│   │   ├── verify-error/
│   │   └── verify-success/
│   ├── dashboard/              # Dashboard pages
│   │   ├── document-list/
│   │   └── viewpdf/[id]/
│   ├── share/                  # Shared document access
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Home page
├── components/                 # Reusable components
│   ├── auth/                  # Authentication components
│   ├── document-list/         # Document list components
│   ├── viewpdf/                 # PDF Viewer components
│   ├── share/                 # Shared document components
│   └── ...other components
├── hooks/                     # Custom React hooks
├── libs/                      # Utility libraries
│   ├── api/                  # API configuration
│   ├── auth/                 # Authentication utilities
│   └── constants/            # Application constants
├── redux/                     # Redux store configuration
│   └── features/             # Feature-based slices
├── types/                     # TypeScript type definitions
├── styles/                    # Additional styles
└── messages/                  # Internationalization messages
```

## 🎯 Key Features

### Authentication Flow

1. **Registration**
   - Email/password registration
   - Email verification required
   - Google OAuth option

2. **Login**
   - Email/password login
   - Google OAuth login
   - Automatic token checking

3. **Email Verification**
   - Verification email sent on registration
   - Resend verification option
   - Success/error handling

### PDF Viewer Capabilities

1. **Document Viewing**
   - High-quality PDF rendering
   - Zoom controls (fit-to-page, fit-to-width, custom zoom)
   - Page navigation
   - Full-screen mode

2. **Annotation Tools**
   - Text annotations
   - Drawing tools (rectangle, circle, arrow, line)
   - Free text annotations
   - Color customization

3. **Collaboration Features**
   - Role-based permissions
   - Auto-save functionality

### File Management

1. **Upload Options**
   - File browser upload
   - Google Drive import
   - Progress tracking

2. **File Operations**
   - Download original PDF
   - Download with annotations
   - Delete files (owner only)
   - Share files

3. **Sharing & Permissions**
   - Invite users by email
   - Role assignment (Owner, Editor, Viewer)
   - Shareable links
   - Access control

## 🌍 Internationalization

The app supports multiple languages using `next-intl`:

- English (default)
- Vietnamese

To add a new language:

1. Create message files in `messages/[locale].json`
2. Update the locale configuration
3. Add language switcher option

## 🔐 Authentication & Security

### JWT Token Management
- Automatic token checking
- Secure cookie storage
- Token expiration handling

### API Security
- CSRF protection
- Request/response validation
- Error boundary handling

### Data Protection
- No sensitive data in localStorage
- Secure HTTP-only cookies
- XSS protection
- Input sanitization

## 🚀 Development

### Running Tests

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check
```

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm run start

# Analyze bundle size
npm run analyze
```

## 🔍 API Routes

The frontend includes API routes that proxy requests to the backend:

### Authentication APIs
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/verify-email` - Email verification
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### File Management APIs
- `POST /api/file/upload` - Upload PDF file
- `GET /api/file/list` - List user files
- `GET /api/file/[id]/download` - Download file
- `DELETE /api/file/[id]` - Delete file
- `POST /api/file/invite` - Invite users
- `POST /api/file/change-role` - Change user role

### Annotation APIs
- `GET /api/file/[id]/annotation` - Get annotations
- `POST /api/file/[id]/annotation/save` - Save annotations

### Sharing APIs
- `POST /api/file/shareable-link/create` - Create shareable link
- `POST /api/file/access-via-link` - Access via link

## 🎨 Styling & Theming

### Tailwind CSS Configuration

The project uses Tailwind CSS with custom configuration:

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {...},
        secondary: {...}
      }
    }
  }
}
```

### Custom Components

All components follow a consistent design system:
- Reusable UI components
- Consistent spacing and typography
- Accessible design patterns

## 📦 Deployment

### Production Environment Variables

```env
NODE_ENV=production
NEXT_APP_FRONTEND_URL=https://yourdomain.com
NEXT_APP_BACKEND_URL=https://api.yourdomain.com/api
NEXT_APP_PDFTRON_LICENSE_KEY=your-production-webviewer-license
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Static Export (Optional)

```bash
# Generate static export
npm run export

# Serve static files
npx serve out
```

## 🔧 Performance Optimization

### Bundle Analysis

```bash
# Analyze bundle size
npm run analyze
```

### Optimization Techniques

1. **Code Splitting**
   - Dynamic imports for large components
   - Route-based splitting
   - Component lazy loading

2. **Image Optimization**
   - Next.js Image component
   - WebP format support
   - Responsive images

3. **Caching Strategies**
   - Static asset caching
   - API response caching
   - Service worker caching

## 🐛 Troubleshooting

### Common Issues

1. **WebViewer Loading Issues**
   ```
   Error: WebViewer files not found
   ```
   - Ensure WebViewer files are in `public/webviewer/`
   - Check license key configuration
   - Verify file permissions

2. **Authentication Errors**
   ```
   Error: Invalid token
   ```
   - Check backend API connectivity
   - Verify JWT token format
   - Clear browser cookies

3. **CORS Issues**
   ```
   Error: CORS policy blocked
   ```
   - Verify backend CORS configuration
   - Check API endpoint URLs
   - Ensure proper headers

4. **Build Errors**
   ```
   Error: Type errors in build
   ```
   - Run `npm run type-check`
   - Fix TypeScript errors
   - Update type definitions

### Debug Mode

```bash
# Enable debug mode
DEBUG=* npm run dev

# Debug specific modules
DEBUG=api:* npm run dev
```

### Browser DevTools

1. **Network Tab**: Monitor API requests
2. **Console**: Check for JavaScript errors
3. **Application Tab**: Inspect cookies and storage
4. **Redux DevTools**: Debug state changes

## 🧪 Testing

### Test Structure

```
tests/
├── __mocks__/           # Mock files
├── components/          # Component tests
├── pages/              # Page tests
├── utils/              # Utility tests
└── setup.ts            # Test setup
```

### Testing Commands

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- components/PDFViewer.test.tsx

# Run tests with coverage
npm run test:coverage

# Update snapshots
npm run test -- --updateSnapshot
```

### Test Examples

```typescript
// components/PDFViewer.test.tsx
import { render, screen } from '@testing-library/react';
import PDFViewer from '@/components/PDFViewer';

describe('PDFViewer', () => {
  it('renders PDF viewer container', () => {
    render(<PDFViewer pdfId="test-id" />);
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
  });
});
```

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make changes and commit**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open Pull Request**

### Code Standards

- **TypeScript**: Strict type checking
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **Conventional Commits**: Commit message format

### Component Guidelines

1. **File Naming**: PascalCase for components
2. **Props Interface**: Define clear prop types
3. **Error Boundaries**: Wrap error-prone components
4. **Accessibility**: Include ARIA labels and roles
5. **Performance**: Use React.memo for expensive components

## 📚 Learning Resources

### Next.js Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Learn](https://nextjs.org/learn)
- [App Router Guide](https://nextjs.org/docs/app)

### PDFTron WebViewer
- [WebViewer Documentation](https://www.pdftron.com/documentation/web/)
- [WebViewer API Reference](https://www.pdftron.com/api/web/)
- [WebViewer Samples](https://github.com/PDFTron/webviewer-samples)

### Redux Toolkit
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [RTK Query Guide](https://redux-toolkit.js.org/rtk-query/overview)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎉 Getting Started Checklist

- [ ] Clone repository
- [ ] Install dependencies (`npm install`)
- [ ] Setup environment variables (`.env.local`)
- [ ] Download/setup WebViewer files
- [ ] Configure backend connection
- [ ] Start development server (`npm run dev`)
- [ ] Test authentication flow
- [ ] Upload and view a PDF
- [ ] Test annotation features
- [ ] Verify sharing functionality

Happy coding! 🚀
