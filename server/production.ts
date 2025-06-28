// Production configuration and utilities
export const isProduction = process.env.NODE_ENV === 'production';

// Production-safe logging utility
export function debugLog(...args: any[]) {
  if (!isProduction) {
    console.log(...args);
  }
}

export function errorLog(...args: any[]) {
  if (!isProduction) {
    console.error(...args);
  }
}

// Environment validation for production
export function validateProductionEnvironment() {
  const required = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'ADMIN_PASSWORD'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables for production: ${missing.join(', ')}`);
  }
}

// Production security headers
export const productionSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

// Cache control headers for production
export const cacheHeaders = {
  static: 'public, max-age=31536000, immutable',
  api: 'no-cache, no-store, must-revalidate',
  html: 'no-cache'
};