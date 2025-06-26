import type { Request, Response, NextFunction } from 'express';

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security delay calculation
export function getSecurityDelay(attemptCount: number): number {
  const delays = [0, 1000, 2000, 4000, 8000]; // Progressive delays in ms
  return delays[Math.min(attemptCount - 1, delays.length - 1)] || 8000;
}

// Rate limiting check
export function checkRateLimit(type: string, clientIP: string): { allowed: boolean; message?: string } {
  const key = `${type}:${clientIP}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = type === 'auth' ? 5 : 100;
  
  const current = rateLimitStore.get(key);
  
  if (!current) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }
  
  if (now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }
  
  if (current.count >= maxAttempts) {
    return { 
      allowed: false, 
      message: `Rate limit exceeded. Try again after ${Math.ceil((current.resetTime - now) / 60000)} minutes.` 
    };
  }
  
  current.count++;
  return { allowed: true };
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.paystack.co; font-src 'self' https:; object-src 'none'; frame-src 'none';"
    );
  }
  
  next();
}

// Content type validation
export function validateContentType(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({ message: 'Content-Type must be application/json' });
    }
  }
  next();
}

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes to prevent injection
    .trim()
    .substring(0, 1000); // Limit length
}

// SQL injection prevention
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[';\\]/g, '') // Remove SQL injection characters
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b/gi, '')
    .trim()
    .substring(0, 500);
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Password validation
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain uppercase, lowercase, and numeric characters' };
  }
  
  if (/(.)\1{2,}/.test(password)) {
    return { valid: false, message: 'Password cannot contain repeated characters' };
  }
  
  return { valid: true };
}

// Authentication rate limiting middleware
export function authRateLimit(type: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const result = checkRateLimit(type, clientIP);
    
    if (!result.allowed) {
      auditLog('rate_limit_exceeded', undefined, { type, clientIP });
      return res.status(429).json({ message: result.message });
    }
    
    next();
  };
}

// Audit logging
export function auditLog(action: string, userId?: string, details?: any) {
  if (process.env.NODE_ENV === 'production') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId: userId || 'anonymous',
      details: details || {},
      ip: details?.clientIP || 'unknown'
    };
    
    // In production, this would go to a proper logging service
    console.error('AUDIT:', JSON.stringify(logEntry));
  }
}

// Session security cleanup
export function clearSessionSecurely(res: Response) {
  res.clearCookie('connect.sid', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
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