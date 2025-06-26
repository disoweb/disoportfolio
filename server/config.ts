// Production configuration and environment variables
export const config = {
  // Environment settings
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Server configuration
  port: process.env.PORT || 5000,
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  
  // Session configuration
  sessionSecret: process.env.SESSION_SECRET,
  sessionMaxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
  
  // Security settings
  rateLimiting: {
    // Multiply by environment factor for production vs development
    multiplier: process.env.NODE_ENV === 'production' ? 1 : 5,
    auth: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxAttempts: 5
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes  
      maxAttempts: 100
    },
    payment: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxAttempts: 5
    }
  },
  
  // CORS settings
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://*.replit.app', 'https://*.replit.dev']
      : true,
    credentials: true
  },
  
  // Content Security Policy
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "https://api.paystack.co"],
    fontSrc: ["'self'", "https:"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"]
  },
  
  // Request size limits
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  
  // Audit logging
  auditLog: {
    enabled: process.env.NODE_ENV === 'production',
    sensitiveFields: ['password', 'token', 'secret', 'key']
  }
};