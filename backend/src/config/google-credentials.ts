import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Google Credentials Helper
 * Handles service account credentials from environment variables or file
 */

export interface GoogleCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

/**
 * Get Google credentials from environment or file
 */
export function getGoogleCredentials(): string {
  // Try to get credentials from environment variable first (for production)
  const googleCredentialsEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (googleCredentialsEnv) {
    console.log('📋 Using Google credentials from environment variable');
    
    try {
      // Parse to validate JSON format
      const credentials = JSON.parse(googleCredentialsEnv);
      
      // Create credentials file in temp location for libraries that require file path
      const tempCredentialsPath = join(process.cwd(), 'temp-service-account.json');
      writeFileSync(tempCredentialsPath, JSON.stringify(credentials, null, 2));
      
      return tempCredentialsPath;
    } catch (error) {
      console.error('❌ Invalid JSON in GOOGLE_SERVICE_ACCOUNT_KEY environment variable:', error.message);
      throw new Error('Invalid Google service account credentials in environment variable');
    }
  }
  
  // Fallback to local file (for development)
  const localCredentialsPath = join(process.cwd(), 'config', 'service-account-key.json');
  
  if (existsSync(localCredentialsPath)) {
    console.log('📁 Using Google credentials from local file');
    return localCredentialsPath;
  }
  
  throw new Error('Google service account credentials not found. Please set GOOGLE_SERVICE_ACCOUNT_KEY environment variable or create config/service-account-key.json file');
}

/**
 * Get credentials as JSON object
 */
export function getGoogleCredentialsObject(): GoogleCredentials {
  const googleCredentialsEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  if (googleCredentialsEnv) {
    try {
      return JSON.parse(googleCredentialsEnv);
    } catch (error) {
      throw new Error('Invalid JSON in GOOGLE_SERVICE_ACCOUNT_KEY environment variable');
    }
  }
  
  const localCredentialsPath = join(process.cwd(), 'config', 'service-account-key.json');
  
  if (existsSync(localCredentialsPath)) {
    const fs = require('fs');
    return JSON.parse(fs.readFileSync(localCredentialsPath, 'utf8'));
  }
  
  throw new Error('Google service account credentials not found');
}

/**
 * Initialize Google credentials
 * Creates the config directory and credentials file if needed
 */
export function initializeGoogleCredentials(): string {
  try {
    const credentialsPath = getGoogleCredentials();
    console.log('✅ Google credentials initialized successfully');
    return credentialsPath;
  } catch (error) {
    console.error('❌ Failed to initialize Google credentials:', error.message);
    throw error;
  }
}

/**
 * Clean up temporary credentials file
 */
export function cleanupTempCredentials(): void {
  const tempCredentialsPath = join(process.cwd(), 'temp-service-account.json');
  
  if (existsSync(tempCredentialsPath)) {
    try {
      const fs = require('fs');
      fs.unlinkSync(tempCredentialsPath);
      console.log('🧹 Cleaned up temporary credentials file');
    } catch (error) {
      console.warn('⚠️ Failed to clean up temporary credentials file:', error.message);
    }
  }
}

// Clean up on process exit
process.on('exit', cleanupTempCredentials);
process.on('SIGINT', () => {
  cleanupTempCredentials();
  process.exit();
});
process.on('SIGTERM', () => {
  cleanupTempCredentials();
  process.exit();
}); 