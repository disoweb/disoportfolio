# DiSO Webs - Production Deployment Guide

## Overview
This guide covers deploying DiSO Webs to production with enterprise-level security and performance optimizations.

## Environment Setup

### Required Environment Variables
```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database"

# Authentication & Security
SESSION_SECRET="generate-secure-32-character-string"
ADMIN_PASSWORD="secure-admin-password-here"

# Payment Integration
PAYSTACK_SECRET_KEY="sk_live_your_paystack_secret_key"
PAYSTACK_PUBLIC_KEY="pk_live_your_paystack_public_key"

# Application Configuration
NODE_ENV="production"
PORT="5000"
```

### Security Configuration
The application includes comprehensive security features:

- **Rate Limiting**: Configurable per-endpoint rate limits
- **CSRF Protection**: Content-Type validation and origin checking
- **Input Validation**: SQL injection prevention and sanitization
- **Session Security**: PostgreSQL-backed sessions with regeneration
- **Audit Logging**: Comprehensive security event tracking
- **Progressive Delays**: Automated delay increases for suspicious activity

### Performance Optimizations

#### Database
- Connection pooling via Neon serverless
- Optimized queries with proper indexing
- Session cleanup automation

#### Frontend
- Vite production builds with optimization
- Lazy loading for better performance
- Efficient state management with TanStack Query

#### Backend
- Express.js with security middleware
- Comprehensive error handling
- Request size validation

## Deployment Steps

### 1. Environment Setup
1. Copy `.env.example` to `.env`
2. Configure all required environment variables
3. Ensure database is accessible and configured

### 2. Database Migration
```bash
npm run db:push
```

### 3. Build Application
```bash
npm run build
```

### 4. Start Production Server
```bash
npm start
```

## Security Checklist

- [ ] All environment variables configured
- [ ] Database secured with proper credentials
- [ ] Session secret is cryptographically secure
- [ ] Paystack keys are production keys
- [ ] Rate limiting configured appropriately
- [ ] HTTPS enabled for production domain
- [ ] Admin credentials are secure

## Monitoring

### Key Metrics to Monitor
- Response times for payment processing
- Authentication success/failure rates
- Database connection pool usage
- Error rates and security violations

### Audit Logs
The system automatically logs:
- Authentication attempts
- Payment operations
- Admin actions
- Security violations
- Rate limit exceeded events

## Maintenance

### Regular Tasks
- Monitor audit logs for security violations
- Review and cleanup expired sessions
- Update dependencies regularly
- Backup database regularly

### Performance Tuning
- Adjust rate limits based on usage patterns
- Monitor and optimize database queries
- Scale session storage as needed

## Troubleshooting

### Common Issues
1. **Authentication failures**: Check session storage and database connectivity
2. **Payment issues**: Verify Paystack configuration and network connectivity
3. **Rate limiting**: Adjust limits based on legitimate usage patterns
4. **Database connections**: Monitor connection pool usage

### Health Checks
- `/api/auth/user` - Authentication system health
- `/api/services` - Database connectivity
- Payment flow end-to-end testing

## Support

For production support:
- Review audit logs for security events
- Check application logs for errors
- Monitor database performance
- Verify external service connectivity (Paystack)