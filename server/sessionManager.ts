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
    rolling: true, // Reset expiry on activity
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: config.cookieMaxAge || 7 * 24 * 60 * 60 * 1000, // 7 days default
      sameSite: 'lax',
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
        // Store user ID in session
        req.session.userId = user.id;
        req.session.authMethod = authMethod as any;
        req.session.loginTime = Date.now();
        req.session.lastActivity = Date.now();
        
        // Save session
        req.session.save((err) => {
          if (err) {
            console.error('[SESSION] Error saving session:', err);
            auditLog('session_save_error', user.id, { error: err.message });
            reject(err);
          } else {
            console.log('[SESSION] Session created for user:', user.id);
            auditLog('session_created', user.id, { authMethod });
            resolve();
          }
        });
      } catch (error) {
        console.error('[SESSION] Error creating session:', error);
        reject(error);
      }
    });
  },

  // Get current user from session
  async getCurrentUser(req: Request): Promise<User | null> {
    try {
      // Check for userId in session
      if (req.session?.userId) {
        const user = await storage.getUserById(req.session.userId);
        if (user) {
          // Update last activity
          req.session.lastActivity = Date.now();
          return user;
        }
      }
      
      // Check for passport user
      if (req.session?.passport?.user) {
        const passportUser = req.session.passport.user;
        const userId = typeof passportUser === 'string' ? passportUser : passportUser.id;
        
        if (userId) {
          const user = await storage.getUserById(userId);
          if (user) {
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

  // Validate session
  isSessionValid(req: Request): boolean {
    if (!req.session?.userId) {
      return false;
    }
    
    // Check session age (optional - enforce maximum session lifetime)
    const maxSessionAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (req.session.loginTime && Date.now() - req.session.loginTime > maxSessionAge) {
      return false;
    }
    
    // Check inactivity timeout (optional)
    const inactivityTimeout = 24 * 60 * 60 * 1000; // 24 hours
    if (req.session.lastActivity && Date.now() - req.session.lastActivity > inactivityTimeout) {
      return false;
    }
    
    return true;
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
    // Check if session exists
    if (!req.session) {
      return res.status(401).json({ message: "No session found" });
    }
    
    // Validate session
    if (!SessionManager.isSessionValid(req)) {
      await SessionManager.destroySession(req, res);
      return res.status(401).json({ message: "Session expired" });
    }
    
    // Get current user
    const user = await SessionManager.getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Attach user to request
    (req as any).user = user;
    
    // Refresh session activity
    await SessionManager.refreshSession(req);
    
    next();
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
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