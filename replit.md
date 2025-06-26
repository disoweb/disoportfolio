# DiSO Webs - Portfolio and Service Management Platform

## Overview

DiSO Webs is a comprehensive web development agency platform that combines a modern portfolio website with a full-featured client management system. The application serves as both a showcase for the agency's services and a complete project management solution for handling client orders, projects, and communications.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with multiple strategies (Local, Google, Twitter, Replit)
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful endpoints with proper error handling

### Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL via Neon serverless
- **Migrations**: Drizzle Kit for schema management
- **Connection**: Connection pooling with @neondatabase/serverless

## Key Components

### Authentication System
- Multi-provider authentication (Local, Google, Twitter, Replit)
- Role-based access control (client, admin, pm)
- Session persistence with PostgreSQL backing
- Secure password hashing using bcrypt with salt rounds 12
- Dedicated admin login system at /admin route

### Service Management
- Service packages with different tiers (Launch, Growth, Elite)
- Custom quote system for bespoke projects
- Dynamic pricing with add-ons and modifications
- Real-time availability tracking

### Project Management
- Complete project lifecycle tracking
- Project stages (Discovery, Design, Development, Testing, Launch)
- File upload and management
- Real-time messaging between clients and team
- Progress tracking with visual indicators

### Payment Integration
- Paystack integration for Nigerian market
- Order management with status tracking
- Payment verification and webhook handling
- Support for multiple currencies

### Admin Dashboard
- Analytics and reporting
- Client and project management
- Service configuration
- Team workload management

## Data Flow

### User Journey
1. **Public Access**: Users browse services, projects, and company information
2. **Authentication**: Users register/login through multiple providers
3. **Service Selection**: Clients choose from predefined packages or request custom quotes
4. **Order Processing**: Payment integration handles transactions securely
5. **Project Creation**: Successful orders automatically generate projects
6. **Project Management**: Real-time communication and file sharing
7. **Completion**: Project delivery and final handover

### Data Architecture
- **User Management**: Centralized user profiles with role-based permissions
- **Service Catalog**: Configurable service packages with pricing
- **Order System**: Complete order lifecycle from creation to completion
- **Project Tracking**: Detailed project management with stage tracking
- **Communication**: Integrated messaging system with file attachments

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL for data persistence
- **Authentication**: Passport.js ecosystem for multi-provider auth
- **Payments**: Paystack for payment processing
- **UI Components**: Radix UI primitives via shadcn/ui
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React for consistent iconography

### Development Tools
- **TypeScript**: Full type safety across the stack
- **ESLint/Prettier**: Code quality and formatting
- **Vite**: Fast development and optimized builds
- **Drizzle**: Database management and migrations

## Deployment Strategy

### Platform
- **Primary**: Replit deployment with autoscale configuration
- **Alternative**: Netlify support via configuration file
- **Port Configuration**: Application runs on port 5000 (internal) mapped to port 80 (external)

### Build Process
1. **Development**: `npm run dev` - Runs both frontend and backend with hot reload
2. **Production Build**: 
   - Frontend: Vite builds to `dist/public`
   - Backend: ESBuild bundles server to `dist/index.js`
3. **Database**: Migrations run automatically on deployment

### Environment Configuration
- **Development**: Memory-based sessions, local development tools
- **Production**: PostgreSQL sessions, optimized builds, error handling

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- June 25, 2025. Initial setup and migration
- June 25, 2025. Fixed payment callback system and order display functionality
- June 25, 2025. Added clickable order cards with details view and WhatsApp support integration
- June 25, 2025. Implemented project timer system with automatic activation on payment and real-time countdown tracking
- June 25, 2025. Fixed authentication system issues and restored full login functionality with secure session management
- June 25, 2025. Enhanced admin dashboard with comprehensive project management features including progress tracking, stage management, overdue detection, and team action controls
- June 25, 2025. Created dedicated admin login page at /admin with secure bcrypt authentication system for admin@diso.com credentials
- June 25, 2025. Completely redesigned admin projects interface with modern, responsive design optimized for mobile and desktop with enhanced UX, loading states, and clean visual hierarchy
- June 25, 2025. Successfully migrated project from Replit Agent to Replit environment with PostgreSQL database setup, dependency updates, and fixed admin authentication system with proper bcrypt password hashing
- June 26, 2025. Enhanced admin dashboard with comprehensive clickable modals for all transactions, orders, clients, and projects with detailed drill-down information display
- June 26, 2025. Improved landing page hero section with professional button styling (w-auto), removed unprofessional elements, and replaced with clean trust indicators
- June 26, 2025. Added animated success metrics with 2x2 mobile grid layout and intersection observer-triggered counting animations
- June 26, 2025. Updated feature cards to display icons horizontally aligned with headings for better visual hierarchy
- June 26, 2025. Optimized mobile spacing in service packages section by reducing vertical gaps and padding
- June 26, 2025. Successfully migrated service packages from hardcoded frontend data to complete database-driven architecture with PostgreSQL storage, admin CRUD API endpoints, and dynamic content delivery including real-time pricing, features, and delivery date calculations
- June 26, 2025. Enhanced user experience with improved scroll positioning for service packages section, toggleable add-ons section like ROI calculator, and removed unprofessional "Limited time offer" alerts from all service cards
- June 26, 2025. Fixed critical checkout pricing bug by implementing consistent data transformation across all service retrieval methods, converting string priceUsd fields to numeric price fields in API responses, enabling proper ₦150,000 price display instead of ₦0 in checkout flow
- June 26, 2025. Implemented complete authentication-aware checkout flow with 24-hour persistent form storage: unauthenticated users get redirected to /auth page during payment, while authenticated users proceed directly to Paystack payment gateway without interruption
- June 26, 2025. Fixed logout functionality by placing logout route before passport middleware initialization in server/index.ts, resolving "Cannot convert undefined or null to object" errors and enabling proper session cleanup
- June 26, 2025. Enhanced logout security with rate limiting (5 attempts per minute), Content-Type validation for CSRF protection, secure cookie clearing with proper attributes, audit logging, and comprehensive security headers