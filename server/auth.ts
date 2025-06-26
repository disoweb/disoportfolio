import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as TwitterStrategy } from "passport-twitter";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { 
  checkRateLimit, 
  validateContentType, 
  validateEmail, 
  validatePassword, 
  sanitizeInput, 
  auditLog,
  authRateLimit 
} from "./security";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    return false;
  }
}

export async function setupAuth(app: Express) {
  // Session configuration - use PostgreSQL session store if available, fallback to memory
  let sessionStore;
  
  try {
    if (process.env.DATABASE_URL) {
      const PostgresSessionStore = connectPg(session);
      sessionStore = new PostgresSessionStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: false, // Table already exists
        tableName: "sessions",
        ttl: 7 * 24 * 60 * 60, // 7 days in seconds
        errorLog: (error: any) => {
          console.error('Session store error:', error);
        }
      });
      console.log('Using PostgreSQL session store for persistent sessions');
    } else {
      console.log('Using memory store for sessions (DATABASE_URL not available)');
      sessionStore = undefined;
    }
  } catch (error) {
    console.error('Failed to create PostgreSQL session store, falling back to memory store:', error);
    sessionStore = undefined;
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev-secret-key-for-replit-development',
    resave: true,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
      domain: undefined, // Let browser determine domain
      path: '/' // Ensure cookie is available for all paths
    },
    name: 'connect.sid'
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  
  // Initialize passport after session middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Session debugging disabled for production
  // app.use((req, res, next) => {
  //   console.log('Session:', req.session ? 'exists' : 'missing');
  //   console.log('Session ID:', req.sessionID);
  //   next();
  // });

  // Local Strategy (Email/Password)
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          console.log('Login attempt for email:', email);
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          if (!user.password) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Use bcrypt for all password comparisons
          const isValid = await comparePasswords(password, user.password);
          
          if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          console.log('Login successful for user:', user.id);
          return done(null, user);
        } catch (error) {
          console.error('Login strategy error:', error);
          return done(error);
        }
      }
    )
  );

  // Google Strategy - Only register if env vars exist
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback"
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email provided by Google'));
            }

            let user = await storage.getUserByEmail(email);
            
            if (!user) {
              user = await storage.createUser({
                email,
                firstName: profile.name?.givenName || '',
                lastName: profile.name?.familyName || '',
                profileImageUrl: profile.photos?.[0]?.value || '',
                provider: 'google',
                providerId: profile.id
              });
            }

            if (!user || !user.id) {
              return done(new Error('Failed to create or retrieve user'));
            }

            return done(null, user);
          } catch (error) {
            console.error('Google OAuth error:', error);
            return done(error);
          }
        }
      )
    );
  }

  // Twitter Strategy - Only register if env vars exist
  if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
    passport.use(
      new TwitterStrategy(
        {
          consumerKey: process.env.TWITTER_CONSUMER_KEY,
          consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
          callbackURL: "/api/auth/twitter/callback",
          includeEmail: true
        },
        async (token, tokenSecret, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email provided by Twitter'));
            }

            let user = await storage.getUserByEmail(email);
            
            if (!user) {
              user = await storage.createUser({
                email,
                firstName: profile.displayName?.split(' ')[0] || '',
                lastName: profile.displayName?.split(' ')[1] || '',
                profileImageUrl: profile.photos?.[0]?.value || '',
                provider: 'twitter',
                providerId: profile.id
              });
            }

            if (!user || !user.id) {
              return done(new Error('Failed to create or retrieve user'));
            }

            return done(null, user);
          } catch (error) {
            console.error('Twitter OAuth error:', error);
            return done(error);
          }
        }
      )
    );
  }

  passport.serializeUser((user: Express.User, done) => {
    console.log('Serializing user:', user?.id);
    if (!user || !user.id) {
      console.error('Serialization failed: User object or ID is missing');
      return done(new Error('User serialization failed'), false);
    }
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      if (!id) {
        return done(new Error('User ID is missing during deserialization'));
      }
      const user = await storage.getUser(id);
      if (!user) {
        return done(new Error('User not found during deserialization'));
      }
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  // Auth routes with comprehensive security
  app.post("/api/auth/register", authRateLimit('register'), validateContentType, async (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    try {
      const { email, password, firstName, lastName, companyName, phone } = req.body;

      // Enhanced input validation
      if (!email || !password || !firstName) {
        auditLog('register_validation_failed', undefined, { email: email?.substring(0, 5) + '***', clientIP });
        return res.status(400).json({ message: "Email, password, and first name are required" });
      }

      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email).toLowerCase();
      const sanitizedFirstName = sanitizeInput(firstName);
      const sanitizedLastName = sanitizeInput(lastName || '');
      const sanitizedCompanyName = sanitizeInput(companyName || '');
      const sanitizedPhone = sanitizeInput(phone || '');

      // Email validation
      if (!validateEmail(sanitizedEmail)) {
        auditLog('register_invalid_email', undefined, { email: sanitizedEmail.substring(0, 5) + '***', clientIP });
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Password strength validation
      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        auditLog('register_weak_password', undefined, { email: sanitizedEmail.substring(0, 5) + '***', clientIP });
        return res.status(400).json({ message: passwordCheck.message });
      }

      const existingUser = await storage.getUserByEmail(sanitizedEmail);
      if (existingUser) {
        auditLog('register_email_exists', undefined, { email: sanitizedEmail.substring(0, 5) + '***', clientIP });
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await storage.createUser({
        email: sanitizedEmail,
        password: await hashPassword(password),
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName,
        companyName: sanitizedCompanyName,
        phone: sanitizedPhone,
        provider: 'local'
      });

      if (!user || !user.id) {
        auditLog('register_creation_failed', undefined, { email: sanitizedEmail.substring(0, 5) + '***', clientIP });
        return res.status(500).json({ message: "User creation failed" });
      }

      // Store user ID in custom session for reliable authentication
      req.session.userId = user.id;
      req.session.authCompleted = true;
      req.session.authTimestamp = Date.now();
      
      console.log('🚀 REGISTER: Saving session for user:', user.id);
      
      // Save session explicitly before responding
      req.session.save((saveErr: any) => {
        if (saveErr) {
          console.error('🚀 REGISTER: Session save error after registration:', saveErr);
        } else {
          console.log('🚀 REGISTER: Session saved successfully');
        }
        
        // Log in the user automatically with passport
        req.login(user, (err: any) => {
          if (err) {
            console.error('🚀 REGISTER: Auto-login error after registration:', err);
            // Even if passport login fails, we have custom session
          } else {
            console.log('🚀 REGISTER: Passport login successful');
          }
          
          auditLog('register_success', user.id, { email: sanitizedEmail.substring(0, 5) + '***', clientIP });
          
          const sanitizedUser = { ...user };
          delete (sanitizedUser as any).password;
          
          console.log('🚀 REGISTER: Returning user data:', sanitizedUser.id);
          res.status(201).json({ 
            user: sanitizedUser,
            message: "User created successfully"
          });
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", authRateLimit('login'), validateContentType, (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      auditLog('login_validation_failed', undefined, { email: email?.substring(0, 5) + '***', clientIP });
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Sanitize email
    const sanitizedEmail = sanitizeInput(email).toLowerCase();

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        auditLog('login_error', undefined, { email: sanitizedEmail.substring(0, 5) + '***', error: err.message, clientIP });
        return next(err);
      }
      
      if (!user) {
        auditLog('login_failed', undefined, { email: sanitizedEmail.substring(0, 5) + '***', reason: info?.message, clientIP });
        return res.status(401).json({ message: info?.message || "Login failed" });
      }

      // Custom session management to avoid passport issues
      try {
        if (req.session) {
          // Set user ID directly in session without passport wrapper
          (req.session as any).userId = user.id;
          
          // Force immediate session save and regeneration
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error('Session save error:', saveErr);
              auditLog('login_session_error', user.id, { error: saveErr.message, clientIP });
              return res.status(500).json({ message: "Login failed" });
            }
            
            // Set userId directly without regeneration to avoid session issues
            (req.session as any).userId = user.id;
            
            const sanitizedUser = { ...user };
            delete (sanitizedUser as any).password;
            
            auditLog('login_success', user.id, { email: sanitizedEmail.substring(0, 5) + '***', clientIP });
            res.json({ user: sanitizedUser });
          });
        } else {
          console.error('No session object available');
          auditLog('login_session_error', user.id, { error: 'No session available', clientIP });
          return res.status(500).json({ message: "Login failed" });
        }
      } catch (sessionError) {
        console.error('Session error:', sessionError);
        auditLog('login_session_error', user.id, { error: (sessionError as Error).message, clientIP });
        return res.status(500).json({ message: "Login failed" });
      }
    })(req, res, next);
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      console.log('=== Authentication Check (auth.ts) ===');
      console.log('Session ID:', req.sessionID);
      console.log('Session passport:', (req.session as any)?.passport);
      console.log('User from session:', (req.session as any)?.passport?.user);
      console.log('req.user:', req.user);
      console.log('req.isAuthenticated():', req.isAuthenticated?.());
      console.log('Custom session userId:', (req.session as any)?.userId);
      
      // Check multiple sources for user authentication
      let userId = null;
      
      // Check custom session userId first
      if (req.session && (req.session as any).userId) {
        userId = (req.session as any).userId;
        console.log('Found userId in custom session:', userId);
      }
      // Check passport session
      else if ((req.session as any)?.passport?.user) {
        const sessionUser = (req.session as any).passport.user;
        userId = sessionUser.id || sessionUser;
        console.log('Found userId in passport session:', userId);
      }
      // Check req.user
      else if (req.user) {
        userId = (req.user as any).id || req.user;
        console.log('Found userId in req.user:', userId);
      }
      
      if (userId) {
        const user = await storage.getUser(userId);
        console.log('User found in database:', user?.email);
        
        if (user) {
          const sanitizedUser = { ...user };
          delete (sanitizedUser as any).password;
          console.log('=== End Authentication Check (auth.ts) ===');
          return res.json(sanitizedUser);
        }
      }
      
      console.log('No authenticated user found');
      console.log('=== End Authentication Check (auth.ts) ===');
      res.json(null);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Failed to get user' });
    }
  });

  // Social auth routes - only register if strategies are configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
    app.get("/api/auth/google/callback", 
      passport.authenticate("google", { failureRedirect: "/auth?error=google_failed" }),
      (req, res) => {
        res.redirect("/?auth=success");
      }
    );
  } else {
    app.get("/api/auth/google", (req, res) => {
      res.status(501).json({ message: "Google OAuth not configured" });
    });
  }

  if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
    app.get("/api/auth/twitter", passport.authenticate("twitter"));
    app.get("/api/auth/twitter/callback",
      passport.authenticate("twitter", { failureRedirect: "/auth?error=twitter_failed" }),
      (req, res) => {
        res.redirect("/?auth=success");
      }
    );
  } else {
    app.get("/api/auth/twitter", (req, res) => {
      res.status(501).json({ message: "Twitter OAuth not configured" });
    });
  }

  // Replit auth routes
  app.get("/api/auth/replit", (req, res) => {
    // Check if we're in a Replit environment
    if (process.env.REPLIT_CLUSTER || process.env.REPL_SLUG) {
      // Use simple Replit header-based auth for development
      const userId = req.headers['x-replit-user-id'] as string;
      const userName = req.headers['x-replit-user-name'] as string;
      const userEmail = `${userName}@replit.com`; // Fallback email
      
      if (userId && userName) {
        // Create or get user
        storage.getUserByEmail(userEmail).then(async (user) => {
          if (!user) {
            user = await storage.createUser({
              email: userEmail,
              firstName: userName,
              lastName: '',
              provider: 'replit',
              providerId: userId
            });
          }
          
          if (user) {
            req.login(user, (err) => {
              if (err) {
                return res.status(500).json({ message: "Login failed" });
              }
              res.redirect("/?auth=success");
            });
          } else {
            res.status(500).json({ message: "Failed to create user" });
          }
        }).catch(() => {
          res.status(500).json({ message: "Authentication failed" });
        });
      } else {
        res.status(401).json({ message: "Not authenticated with Replit" });
      }
    } else {
      res.status(501).json({ message: "Replit OAuth only works in Replit environment" });
    }
  });
}

export const isAuthenticated = async (req: any, res: any, next: any) => {
  try {
    // Debug logging disabled for production
    // if (req.url === '/api/orders') {
    //   console.log('Session check for order creation');
    // }
    
    // Check custom session userId first (from our login system)
    if (req.session && (req.session as any).userId) {
      const userId = (req.session as any).userId;
      console.log('Found userId in session:', userId);
      const user = await storage.getUser(userId);
      if (user) {
        console.log('User found in database:', user.email);
        req.user = user;
        return next();
      } else {
        console.log('User not found in database for userId:', userId);
      }
    }

    // Fallback check for passport session
    if (req.session && req.session.passport && req.session.passport.user) {
      console.log('Found passport session:', req.session.passport.user);
      const user = await storage.getUser(req.session.passport.user);
      if (user) {
        req.user = user;
        return next();
      }
    }
    
    // Final fallback for req.user
    if (req.user) {
      console.log('Using existing req.user');
      return next();
    }
    
    console.log('Authentication failed - no valid session found');
    if (req.url === '/api/orders') {
      console.log('=== End Authentication Check ===');
    }
    return res.status(401).json({ message: "Authentication required" });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: "Authentication required" });
  }
};