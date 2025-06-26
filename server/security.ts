import { Request, Response, NextFunction } from "express";

// Production-ready security configuration with environment-based tuning
const attemptStore = new Map();

// Rate limiting multiplier from environment (default 1.0 for production)
const RATE_MULTIPLIER = parseFloat(process.env.RATE_LIMIT_MULTIPLIER || "1.0");

// Base rate limits - can be scaled by environment
const BASE_RATE_LIMITS = {
  logout: { max: 5, window: 60000 },         // 5 attempts per minute
  login: { max: 5, window: 900000 },         // 5 attempts per 15 minutes
  register: { max: 3, window: 3600000 },     // 3 attempts per hour
  password: { max: 3, window: 900000 },      // 3 attempts per 15 minutes
  payment_reactivation: { max: 3, window: 300000 }, // 3 payment reactivations per 5 minutes
  admin: { max: 10, window: 900000 },        // 10 admin actions per 15 minutes
  api: { max: 100, window: 60000 },          // 100 API calls per minute
  upload: { max: 5, window: 300000 },        // 5 uploads per 5 minutes
  checkout: { max: 10, window: 600000 },     // 10 checkout attempts per 10 minutes
  contact: { max: 3, window: 3600000 },      // 3 contact form submissions per hour
  order_cancel: { max: 5, window: 300000 },  // 5 cancellations per 5 minutes
  auth_check: { max: 100, window: 300000 },  // 100 auth checks per 5 minutes
};

// Apply rate multiplier to create final configuration
const RATE_LIMITS = Object.fromEntries(
  Object.entries(BASE_RATE_LIMITS).map(([key, config]) => [
    key,
    {
      max: Math.max(1, Math.floor(config.max * RATE_MULTIPLIER)),
      window: config.window
    }
  ])
);

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

// Enhanced email validation with security checks
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false; // RFC 5321 limit
  
  // Enhanced email regex with stricter validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  // Additional security checks
  if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) return false;
  if (email.includes('<') || email.includes('>') || email.includes('"')) return false;
  
  return emailRegex.test(email);
}

// Enhanced order ID validation
export function validateOrderId(orderId: string): boolean {
  if (!orderId || typeof orderId !== 'string') return false;
  if (orderId.length < 10 || orderId.length > 50) return false;
  
  // Only allow alphanumeric and safe characters
  const orderIdRegex = /^[a-zA-Z0-9_-]+$/;
  return orderIdRegex.test(orderId);
}

// Enhanced user ID validation
export function validateUserId(userId: string): boolean {
  if (!userId || typeof userId !== 'string') return false;
  if (userId.length < 1 || userId.length > 100) return false;
  
  // Allow alphanumeric, underscore, dash, and dot for various ID formats
  const userIdRegex = /^[a-zA-Z0-9._-]+$/;
  return userIdRegex.test(userId);
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