import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { auditLog } from "./security";
import type { User } from "@shared/schema";

// Extend Express types to include our custom session properties
declare module "express-session" {
  interface SessionData {
    userId?: string;
    passport?: {
      user: string | { id: string };
    };
    authMethod?: "local" | "google" | "facebook" | "twitter" | "replit";
    loginTime?: number;
    lastActivity?: number;
  }
}

// Session configuration options
interface SessionConfig {
  secret: string;
  databaseUrl?: string;
  cookieMaxAge?: number;
  cookieName?: string;
}

// Create and configure session middleware
export function createSessionMiddleware(config: SessionConfig): session.SessionOptions {
  let store: any = undefined;
  
  // Setup PostgreSQL session store if database URL is provided
  if (config.databaseUrl) {
    try {
      const pgStore = connectPg(session);
      store = new pgStore({
        conString: config.databaseUrl,
        createTableIfMissing: false,
        tableName: "sessions",
        ttl: config.cookieMaxAge ? config.cookieMaxAge / 1000 : 7 * 24 * 60 * 60, // Convert ms to seconds
        errorLog: (error: any) => {
          console.error('[SESSION] PostgreSQL store error:', error);
          auditLog('session_store_error', undefined, { error: error.message });
        }
      });
      console.log('[SESSION] Using PostgreSQL session store');
    } catch (error) {
      console.error('[SESSION] Failed to create PostgreSQL store, using memory store:', error);
      auditLog('session_store_init_failed', undefined, { error: (error as Error).message });
    }
  } else {
    console.log('[SESSION] Using memory store (no database URL provided)');
  }

  return {
    name: config.cookieName || 'diso.sid',
    secret: config.secret,
    store,
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    rolling: false, // Don't reset expiry on every request - this can cause issues
    cookie: {
      secure: true, // Required for sameSite: 'none'
      httpOnly: true,
      maxAge: config.cookieMaxAge || 7 * 24 * 60 * 60 * 1000, // 7 days default
      sameSite: 'none', // Allow cross-site cookies for iframe environments
      path: '/'
    }
  };
}

// Session management helper functions
export const SessionManager = {
  // Create a new session for a user
  async createUserSession(req: Request, user: User, authMethod: string = 'local'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔧 [SESSION DEBUG] Creating session for user:', user.id, 'method:', authMethod);
        console.log('🔧 [SESSION DEBUG] Current session ID:', req.sessionID);
        console.log('🔧 [SESSION DEBUG] Session before modification:', {
          userId: req.session.userId,
          sessionID: req.sessionID,
          cookie: req.session.cookie
        });
        
        // Store user ID in session
        req.session.userId = user.id;
        req.session.authMethod = authMethod as any;
        req.session.loginTime = Date.now();
        req.session.lastActivity = Date.now();
        
        console.log('🔧 [SESSION DEBUG] Session data set:', {
          userId: req.session.userId,
          authMethod: req.session.authMethod,
          loginTime: req.session.loginTime,
          sessionID: req.sessionID
        });
        
        // Save session with regeneration to ensure fresh session ID
        req.session.save((err) => {
          if (err) {
            console.error('🔧 [SESSION DEBUG] Error saving session:', err);
            auditLog('session_save_error', user.id, { error: err.message });
            reject(err);
          } else {
            console.log('🔧 [SESSION DEBUG] Session saved successfully for user:', user.id, 'sessionID:', req.sessionID);
            auditLog('session_created', user.id, { authMethod });
            
            // Add a small delay to ensure session is fully persisted
            setTimeout(() => {
              resolve();
            }, 100);
          }
        });
      } catch (error) {
        console.error('🔧 [SESSION DEBUG] Error creating session:', error);
        reject(error);
      }
    });
  },

  // Get current user from session
  async getCurrentUser(req: Request): Promise<User | null> {
    try {
      console.log('🔍 [SESSION DEBUG] Getting current user, sessionID:', req.sessionID);
      console.log('🔍 [SESSION DEBUG] Session data:', {
        userId: req.session?.userId,
        passport: req.session?.passport,
        loginTime: req.session?.loginTime,
        lastActivity: req.session?.lastActivity
      });
      
      // Check for userId in session
      if (req.session?.userId) {
        console.log('🔍 [SESSION DEBUG] Found userId in session:', req.session.userId);
        const user = await storage.getUserById(req.session.userId);
        if (user) {
          console.log('🔍 [SESSION DEBUG] User found in database:', user.id);
          // Update last activity
          req.session.lastActivity = Date.now();
          return user;
        } else {
          console.log('🔍 [SESSION DEBUG] User not found in database for ID:', req.session.userId);
        }
      } else {
        console.log('🔍 [SESSION DEBUG] No userId in session');
      }
      
      // Check for passport user
      if (req.session?.passport?.user) {
        console.log('🔍 [SESSION DEBUG] Found passport user:', req.session.passport.user);
        const passportUser = req.session.passport.user;
        const userId = typeof passportUser === 'string' ? passportUser : passportUser.id;
        
        if (userId) {
          console.log('🔍 [SESSION DEBUG] Extracting userId from passport:', userId);
          const user = await storage.getUserById(userId);
          if (user) {
            console.log('🔍 [SESSION DEBUG] User found via passport, migrating session');
            // Migrate to our session format
            req.session.userId = user.id;
            req.session.lastActivity = Date.now();
            return user;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('[SESSION] Error getting current user:', error);
      return null;
    }
  },

  // Destroy user session
  async destroySession(req: Request, res: Response): Promise<void> {
    return new Promise((resolve) => {
      const userId = req.session?.userId;
      
      req.session.destroy((err) => {
        if (err) {
          console.error('[SESSION] Error destroying session:', err);
          auditLog('session_destroy_error', userId, { error: err.message });
        } else {
          auditLog('session_destroyed', userId);
        }
        
        // Clear cookie regardless of session destroy result
        res.clearCookie('diso.sid', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/'
        });
        
        resolve();
      });
    });
  },

  // Validate session (simplified for debugging)
  isSessionValid(req: Request): boolean {
    // For now, just check if userId exists - remove complex validation that might be causing issues
    return !!(req.session?.userId);
  },

  // Refresh session
  async refreshSession(req: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!req.session) {
        reject(new Error('No session to refresh'));
        return;
      }
      
      req.session.lastActivity = Date.now();
      req.session.save((err) => {
        if (err) {
          console.error('[SESSION] Error refreshing session:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
};

// Enhanced authentication middleware
export const authenticateRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🔐 [AUTH DEBUG] Checking authentication for:', req.path, 'sessionID:', req.sessionID);
    
    // Check if session exists
    if (!req.session) {
      console.log('🔐 [AUTH DEBUG] No session found');
      return res.status(401).json({ message: "No session found" });
    }
    
    console.log('🔐 [AUTH DEBUG] Session exists, checking validity...');
    console.log('🔐 [AUTH DEBUG] Session validation data:', {
      userId: req.session.userId,
      loginTime: req.session.loginTime,
      lastActivity: req.session.lastActivity,
      sessionID: req.sessionID
    });
    
    // Validate session
    const isValid = SessionManager.isSessionValid(req);
    console.log('🔐 [AUTH DEBUG] Session validation result:', isValid);
    
    if (!isValid) {
      console.log('🔐 [AUTH DEBUG] Session invalid, destroying...');
      await SessionManager.destroySession(req, res);
      return res.status(401).json({ message: "Session expired" });
    }
    
    // Get current user
    console.log('🔐 [AUTH DEBUG] Getting current user...');
    const user = await SessionManager.getCurrentUser(req);
    if (!user) {
      console.log('🔐 [AUTH DEBUG] No user found for session');
      return res.status(401).json({ message: "Authentication required" });
    }
    
    console.log('🔐 [AUTH DEBUG] Authentication successful for user:', user.id);
    
    // Attach user to request
    (req as any).user = user;
    
    // Refresh session activity
    await SessionManager.refreshSession(req);
    
    next();
  } catch (error) {
    console.error('🔐 [AUTH DEBUG] Authentication error:', error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

// Session debugging middleware (development only)
export const sessionDebugMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[SESSION DEBUG]', {
      sessionId: req.sessionID,
      session: req.session,
      cookies: req.cookies,
      user: (req as any).user?.id
    });
  }
  next();
};