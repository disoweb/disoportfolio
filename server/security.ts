import { Request, Response, NextFunction } from "express";

// Rate limiting configuration
const attemptStore = new Map();
const RATE_LIMITS = {
  logout: { max: 5, window: 60000 },        // 5 attempts per minute
  login: { max: 10, window: 900000 },       // 10 attempts per 15 minutes
  register: { max: 3, window: 3600000 },    // 3 attempts per hour
  password: { max: 3, window: 900000 },     // 3 attempts per 15 minutes
  payment: { max: 5, window: 300000 },      // 5 attempts per 5 minutes
  admin: { max: 5, window: 900000 },        // 5 attempts per 15 minutes
  api: { max: 100, window: 60000 },         // 100 requests per minute
  upload: { max: 10, window: 300000 }       // 10 uploads per 5 minutes
};

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

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  });
  next();
}

// Content-Type validation middleware
export function validateContentType(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(415).json({ message: "Invalid content type" });
  }
  next();
}

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password strength validation
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { valid: false, message: "Password must contain uppercase, lowercase, and number" };
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