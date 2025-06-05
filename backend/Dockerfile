FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm i

# Copy source code
COPY . .

# Build the application with debugging
RUN npm run build && ls -la dist/

# Production image
FROM node:18-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies using npm install
RUN npm install --production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Debug: List contents of dist directory
RUN ls -la dist/

# Create uploads directory
RUN mkdir -p uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port (Render will set PORT environment variable)
EXPOSE $PORT

# Health check (use PORT environment variable)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

# Start the application (flexible path resolution) with crypto support
CMD ["sh", "-c", "if [ -f dist/main.js ]; then node --experimental-global-webcrypto dist/main.js; elif [ -f dist/src/main.js ]; then node --experimental-global-webcrypto dist/src/main.js; else echo 'main.js not found in dist/ or dist/src/'; exit 1; fi"] 