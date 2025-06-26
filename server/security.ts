import { Request, Response, NextFunction } from "express";

// Enhanced rate limiting configuration with progressive delays
const attemptStore = new Map();
const RATE_LIMITS = {
  logout: { max: 5, window: 60000 },        // 5 attempts per minute
  login: { max: 5, window: 900000 },        // 5 attempts per 15 minutes (reduced for security)
  register: { max: 3, window: 3600000 },    // 3 attempts per hour
  password: { max: 3, window: 900000 },     // 3 attempts per 15 minutes
  payment: { max: 3, window: 300000 },      // 3 attempts per 5 minutes (reduced)
  admin: { max: 3, window: 900000 },        // 3 attempts per 15 minutes (reduced)
  api: { max: 60, window: 60000 },          // 60 requests per minute (reduced)
  upload: { max: 5, window: 300000 },       // 5 uploads per 5 minutes (reduced)
  checkout: { max: 10, window: 600000 },    // 10 checkout attempts per 10 minutes
  contact: { max: 3, window: 3600000 },     // 3 contact form submissions per hour
  order_cancel: { max: 5, window: 300000 }, // 5 cancellations per 5 minutes
  payment_reactivate: { max: 3, window: 300000 } // 3 payment reactivations per 5 minutes
};

// Progressive delay based on attempt count
export function getSecurityDelay(attemptCount: number): number {
  if (attemptCount <= 2) return 0;
  if (attemptCount <= 4) return 1000;   // 1 second
  if (attemptCount <= 6) return 5000;   // 5 seconds
  return 15000; // 15 seconds for persistent attackers
}

// Generic rate limiting function
export function checkRateLimit(type: string, clientIP: string): { allowed: boolean; message?: string } {
  const config = RATE_LIMITS[type as keyof typeof RATE_LIMITS] || RATE_LIMITS.api;
  const key = `${type}_${clientIP}`;
  const now = Date.now();
  
  const attempts = attemptStore.get(key) || { count: 0, timestamp: now };
  if (now - attempts.timestamp > config.window) {
    attempts.count = 0;
    attempts.timestamp = now;
  }
  
  if (attempts.count >= config.max) {
    return { 
      allowed: false, 
      message: `Too many ${type} attempts. Try again later.` 
    };
  }
  
  attempts.count++;
  attemptStore.set(key, attempts);
  return { allowed: true };
}

// Enhanced security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:;",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-Download-Options': 'noopen'
  });
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  next();
}

// Enhanced Content-Type validation with CSRF protection
export function validateContentType(req: Request, res: Response, next: NextFunction) {
  // Only validate for state-changing operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    const origin = req.get('Origin');
    const referer = req.get('Referer');
    const host = req.get('Host');
    
    // Validate Content-Type for JSON endpoints
    if (!contentType || !contentType.includes('application/json')) {
      auditLog('security_violation', undefined, { 
        type: 'invalid_content_type',
        contentType,
        ip: req.ip,
        method: req.method,
        path: req.path
      });
      return res.status(400).json({ 
        message: 'Invalid Content-Type. Expected application/json' 
      });
    }
    
    // Enhanced CSRF protection for sensitive operations
    const isSafeOrigin = origin && (
      origin.includes(host || '') || 
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS.split(',').some(allowed => origin.includes(allowed)))
    );
    
    const isSafeReferer = referer && (
      referer.includes(host || '') ||
      referer.includes('localhost') ||
      referer.includes('127.0.0.1') ||
      (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS.split(',').some(allowed => referer.includes(allowed)))
    );
    
    // Allow requests with proper origin/referer or in development
    if (!isSafeOrigin && !isSafeReferer && process.env.NODE_ENV === 'production') {
      auditLog('security_violation', undefined, { 
        type: 'csrf_protection_triggered',
        origin,
        referer,
        host,
        ip: req.ip,
        method: req.method,
        path: req.path
      });
      return res.status(403).json({ 
        message: 'Request blocked by CSRF protection' 
      });
    }
  }
  next();
}

// Enhanced input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove dangerous characters and normalize whitespace
  return input
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove XSS-prone characters
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .substring(0, 1000);       // Limit length to prevent DoS
}

// SQL injection prevention for dynamic queries (when not using ORM)
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/['";\\]/g, '')   // Remove SQL injection characters
    .replace(/--/g, '')        // Remove SQL comments
    .replace(/\/\*/g, '')      // Remove SQL block comments
    .replace(/\*\//g, '')
    .substring(0, 500);
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Enhanced password strength validation
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  if (password.length > 128) {
    return { valid: false, message: "Password must be less than 128 characters" };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }
  if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character" };
  }
  
  // Check for common weak patterns
  const commonPatterns = [
    /(.)\1{3,}/,           // Same character repeated 4+ times
    /123456|abcdef|qwerty/i, // Common sequences
    /password|admin|login/i   // Common words
  ];
  
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      return { valid: false, message: "Password contains common patterns and is not secure" };
    }
  }
  
  return { valid: true };
}

// Authentication middleware with rate limiting
export function authRateLimit(type: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const rateCheck = checkRateLimit(type, clientIP);
    
    if (!rateCheck.allowed) {
      console.log(`Rate limit exceeded for ${type} from IP ${clientIP}`);
      return res.status(429).json({ message: rateCheck.message });
    }
    
    next();
  };
}

// Audit logging
export function auditLog(action: string, userId?: string, details?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT] ${timestamp} - Action: ${action}, User: ${userId || 'anonymous'}, Details: ${JSON.stringify(details)}`);
}

// Clean session data
export function clearSessionSecurely(res: Response) {
  res.clearCookie('connect.sid', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

// Request size validation
export function validateRequestSize(maxSize: number = 10485760) { // 10MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    if (contentLength > maxSize) {
      return res.status(413).json({ message: "Request too large" });
    }
    next();
  };
}