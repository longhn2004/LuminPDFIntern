#!/usr/bin/env node

/**
 * Prepare Railway Deployment Script
 * Converts service account key to environment variable format
 */

const fs = require('fs');
const path = require('path');

function main() {
  console.log('🚂 Railway Deployment Preparation Tool');
  console.log('======================================\n');

  const serviceAccountPath = path.join(__dirname, '..', 'config', 'service-account-key.json');
  
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Service account key not found at:', serviceAccountPath);
    console.error('💡 Please ensure config/service-account-key.json exists');
    process.exit(1);
  }

  try {
    // Read and validate the service account key
    const serviceAccountKey = fs.readFileSync(serviceAccountPath, 'utf8');
    const keyObject = JSON.parse(serviceAccountKey);
    
    // Validate required fields
    const requiredFields = [
      'type', 'project_id', 'private_key_id', 'private_key', 
      'client_email', 'client_id', 'auth_uri', 'token_uri'
    ];
    
    const missingFields = requiredFields.filter(field => !keyObject[field]);
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields in service account key:', missingFields.join(', '));
      process.exit(1);
    }

    // Create minified JSON (single line, no spaces)
    const minifiedKey = JSON.stringify(keyObject);
    
    console.log('✅ Service account key validated successfully');
    console.log('📋 Environment variable format:\n');
    
    console.log('GOOGLE_SERVICE_ACCOUNT_KEY=' + minifiedKey);
    
    console.log('\n📝 Instructions for Railway deployment:');
    console.log('=====================================');
    console.log('1. Copy the GOOGLE_SERVICE_ACCOUNT_KEY line above');
    console.log('2. Go to Railway project settings');
    console.log('3. Go to Variables tab');
    console.log('4. Add new variable: GOOGLE_SERVICE_ACCOUNT_KEY');
    console.log('5. Paste the JSON value (without GOOGLE_SERVICE_ACCOUNT_KEY=)');
    console.log('6. Deploy your project');
    
    console.log('\n🔒 Security Notes:');
    console.log('- Never commit service-account-key.json to git');
    console.log('- Keep the JSON credentials secure');
    console.log('- Use Railway\'s encrypted environment variables');
    
    // Also save to a temporary file for easy copying
    const outputPath = path.join(__dirname, '..', 'railway-env-vars.txt');
    const envContent = `# Railway Environment Variables
# Copy these to your Railway project settings

GOOGLE_SERVICE_ACCOUNT_KEY=${minifiedKey}

# Other required environment variables:
NODE_ENV=production
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
MONGO_CLOUD_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secure_jwt_secret
JWT_REFRESH_SECRET=your_super_secure_refresh_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-railway-domain.up.railway.app/api/auth/google/callback
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_s3_bucket_name
AWS_S3_BUCKET_URL=https://your-s3-bucket.s3.amazonaws.com
REDIS_URL=redis://your-redis-url:6379
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
APP_URL=https://your-frontend-domain.vercel.app
FRONTEND_URL=https://your-frontend-domain.vercel.app
`;

    fs.writeFileSync(outputPath, envContent);
    console.log(`\n📄 Environment variables template saved to: ${outputPath}`);
    console.log('💡 Update the template with your actual values before using');

  } catch (error) {
    console.error('❌ Error processing service account key:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 