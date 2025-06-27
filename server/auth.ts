import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as TwitterStrategy } from "passport-twitter";
import { Strategy as FacebookStrategy } from "passport-facebook";
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
import { emailService } from "./email";
import crypto from "crypto";

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
      // Initialize PostgreSQL session store with timeout protection
      const PostgresSessionStore = connectPg(session);
      
      // Add connection timeout protection
      const initTimeout = setTimeout(() => {
        console.warn('PostgreSQL session store initialization timeout, using memory store');
        sessionStore = undefined;
      }, 5000);
      
      try {
        sessionStore = new PostgresSessionStore({
          conString: process.env.DATABASE_URL,
          createTableIfMissing: false, // Table already exists
          tableName: "sessions",
          ttl: 7 * 24 * 60 * 60, // 7 days in seconds
          errorLog: (error: any) => {
            console.error('Session store error:', error);
          }
        });
        clearTimeout(initTimeout);
        console.log('Using PostgreSQL session store for persistent sessions');
      } catch (storeError) {
        clearTimeout(initTimeout);
        throw storeError;
      }
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
    resave: true, // Force session save for PostgreSQL compatibility
    saveUninitialized: false,
    store: sessionStore,
    rolling: false, // Disable rolling sessions for stability
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax'
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
          console.log('🔍 [LOGIN DEBUG] Login attempt for email:', email);
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            console.log('❌ [LOGIN DEBUG] User not found for email:', email);
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          console.log('🔍 [LOGIN DEBUG] User found:', {
            id: user.id,
            email: user.email,
            hasPassword: !!user.password,
            passwordLength: user.password?.length
          });
          
          if (!user.password) {
            console.log('❌ [LOGIN DEBUG] User has no password');
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Use bcrypt for all password comparisons
          console.log('🔍 [LOGIN DEBUG] Comparing passwords...');
          const isValid = await comparePasswords(password, user.password);
          console.log('🔍 [LOGIN DEBUG] Password comparison result:', isValid);
          
          if (!isValid) {
            console.log('❌ [LOGIN DEBUG] Password comparison failed');
            return done(null, false, { message: 'Invalid email or password' });
          }

          console.log('✅ [LOGIN DEBUG] Login successful for user:', user.id);
          return done(null, user);
        } catch (error) {
          console.error('❌ [LOGIN DEBUG] Login strategy error:', error);
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

  // Facebook Strategy - Only register if env vars exist
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: "/api/auth/facebook/callback",
          profileFields: ['id', 'email', 'name', 'picture']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email provided by Facebook'));
            }

            let user = await storage.getUserByEmail(email);
            
            if (!user) {
              user = await storage.createUser({
                email,
                firstName: profile.name?.givenName || '',
                lastName: profile.name?.familyName || '',
                profileImageUrl: profile.photos?.[0]?.value || '',
                provider: 'facebook',
                providerId: profile.id
              });
            }

            if (!user || !user.id) {
              return done(new Error('Failed to create or retrieve user'));
            }

            return done(null, user);
          } catch (error) {
            console.error('Facebook OAuth error:', error);
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

  // Custom session management to bypass passport serialization issues
  passport.serializeUser((user: any, done) => {
    try {
      if (!user || !user.id) {
        return done(new Error('User serialization failed'), false);
      }
      done(null, user.id);
    } catch (error) {
      console.error('Serialization error:', error);
      done(error);
    }
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      if (!id) {
        return done(new Error('User ID missing'));
      }
      
      const user = await storage.getUserById(id);
      if (!user) {
        return done(null, false);
      }
      
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(null, false);
    }
  });

  // Debug endpoint to test database connection
  app.get("/api/auth/test-user", async (req, res) => {
    try {
      console.log('🔍 [DEBUG] Testing getUserByEmail function...');
      const user = await storage.getUserByEmail('cyfer33@gmail.com');
      console.log('🔍 [DEBUG] User lookup result:', {
        found: !!user,
        id: user?.id,
        email: user?.email,
        hasPassword: !!user?.password,
        passwordLength: user?.password?.length
      });
      res.json({ 
        success: true, 
        userFound: !!user,
        userId: user?.id,
        hasPassword: !!user?.password 
      });
    } catch (error) {
      console.error('❌ [DEBUG] Database error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Auth routes with comprehensive security
  app.post("/api/auth/register", authRateLimit('register'), validateContentType, async (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    try {
      const { email, password, firstName, lastName, companyName, phone, referralCode } = req.body;

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

      // Check for referrer if referral code is provided
      let referrerId = null;
      if (referralCode) {
        const referrer = await storage.getUserByReferralCode(referralCode);
        if (referrer) {
          referrerId = referrer.id;
          console.log('🔍 Found referrer:', referrer.email, 'for code:', referralCode);
        } else {
          console.log('🔍 No referrer found for code:', referralCode);
        }
      }

      const user = await storage.createUser({
        email: sanitizedEmail,
        password: await hashPassword(password),
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName,
        companyName: sanitizedCompanyName,
        phone: sanitizedPhone,
        provider: 'local',
        referredBy: referrerId
      });

      if (!user || !user.id) {
        auditLog('register_creation_failed', undefined, { email: sanitizedEmail.substring(0, 5) + '***', clientIP });
        return res.status(500).json({ message: "User creation failed" });
      }

      // Store user ID in custom session for reliable authentication
      // Using type assertion for session extension - proper session typing would be ideal
      const extendedSession = req.session as any;
      
      // Regenerate session ID to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration failed:', err);
          // Continue with existing session if regeneration fails
          extendedSession.userId = user.id;
          extendedSession.authCompleted = true;
          extendedSession.authTimestamp = Date.now();
        } else {
          // Set data on new session
          const newExtendedSession = req.session as any;
          newExtendedSession.userId = user.id;
          newExtendedSession.authCompleted = true;
          newExtendedSession.authTimestamp = Date.now();
        }
      });
      
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

      // Robust session management for PostgreSQL session store
      try {
        if (req.session) {
          // Regenerate session ID for security and ensure fresh session
          req.session.regenerate((regenErr) => {
            if (regenErr) {
              console.error('Session regeneration error:', regenErr);
              // Fallback to direct session setting if regeneration fails
              (req.session as any).userId = user.id;
              
              const sanitizedUser = { ...user };
              delete (sanitizedUser as any).password;
              
              auditLog('login_success', user.id, { email: sanitizedEmail.substring(0, 5) + '***', clientIP });
              return res.json({ user: sanitizedUser });
            }
            
            // Set user ID in the regenerated session
            (req.session as any).userId = user.id;
            
            // Also use passport's session serialization for compatibility
            req.logIn(user, (loginErr) => {
              if (loginErr) {
                console.error('Passport login error:', loginErr);
                // Continue without passport login, use custom session only
              }
              
              console.log('🔍 [LOGIN DEBUG] Setting userId in session:', user.id);
              console.log('🔍 [LOGIN DEBUG] Session before save:', {
                sessionId: req.sessionID,
                userId: (req.session as any).userId,
                sessionKeys: Object.keys(req.session)
              });
              
              // Force session save to PostgreSQL immediately
              req.session.save((saveErr) => {
                if (saveErr) {
                  console.error('❌ [LOGIN DEBUG] Session save error:', saveErr);
                  auditLog('login_session_error', user.id, { error: saveErr.message, clientIP });
                  return res.status(500).json({ message: "Login failed" });
                }
                
                console.log('✅ [LOGIN DEBUG] Session saved successfully');
                console.log('🔍 [LOGIN DEBUG] Session after save:', {
                  sessionId: req.sessionID,
                  userId: (req.session as any).userId,
                  sessionKeys: Object.keys(req.session)
                });
                
                const sanitizedUser = { ...user };
                delete (sanitizedUser as any).password;
                
                auditLog('login_success', user.id, { email: sanitizedEmail.substring(0, 5) + '***', clientIP });
                res.json({ user: sanitizedUser });
              });
            });
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
      console.log('🔍 [USER DEBUG] Session check:', {
        sessionExists: !!req.session,
        sessionId: req.sessionID,
        sessionUserId: req.session?.userId,
        sessionKeys: req.session ? Object.keys(req.session) : [],
        passportUser: req.session?.passport?.user,
        reqUser: !!req.user
      });

      // Check multiple sources for user authentication
      let userId = null;
      
      // Check custom session userId first
      if (req.session && (req.session as any).userId) {
        userId = (req.session as any).userId;
        console.log('✅ [USER DEBUG] Found userId in session:', userId);
      }
      // Check passport session
      else if ((req.session as any)?.passport?.user) {
        const sessionUser = (req.session as any).passport.user;
        userId = sessionUser.id || sessionUser;
        console.log('✅ [USER DEBUG] Found userId in passport session:', userId);
      }
      // Check req.user
      else if (req.user) {
        userId = (req.user as any).id || req.user;
        console.log('✅ [USER DEBUG] Found userId in req.user:', userId);
      }
      
      if (userId) {
        console.log('🔍 [USER DEBUG] Looking up user by ID:', userId);
        const user = await storage.getUserById(userId);
        console.log('🔍 [USER DEBUG] User lookup result:', !!user);
        
        if (user) {
          const sanitizedUser = { ...user };
          delete (sanitizedUser as any).password;
          console.log('✅ [USER DEBUG] Returning user data');
          return res.json(sanitizedUser);
        }
      }
      
      console.log('❌ [USER DEBUG] No user found, returning null');
      res.json(null);
    } catch (error) {
      console.error('❌ [USER DEBUG] Error:', error);
      res.json(null);
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

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    app.get("/api/auth/facebook", passport.authenticate("facebook", { scope: ["email"] }));
    app.get("/api/auth/facebook/callback",
      passport.authenticate("facebook", { failureRedirect: "/auth?error=facebook_failed" }),
      (req, res) => {
        res.redirect("/?auth=success");
      }
    );
  } else {
    app.get("/api/auth/facebook", (req, res) => {
      res.status(501).json({ message: "Facebook OAuth not configured" });
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

  // Replit OAuth Strategy - Only register if env vars exist
  if (process.env.REPL_ID && process.env.REPLIT_DOMAINS) {
    try {
      // Import Replit OIDC strategy using dynamic imports
      const { Strategy } = await import("openid-client/passport");
      const client = await import("openid-client");
      
      // Configure Replit OIDC
      const replitConfig = await client.discovery(
        new URL("https://replit.com/oidc"),
        process.env.REPL_ID
      );

      passport.use(
        new Strategy(
          {
            name: "replit",
            config: replitConfig,
            scope: "openid email profile",
            callbackURL: `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/auth/replit/callback`,
          },
          async (tokens: any, done: any) => {
            try {
              const claims = tokens.claims();
              const email = claims.email;
              
              if (!email) {
                return done(new Error('No email provided by Replit'));
              }

              let user = await storage.getUserByEmail(email);
              
              if (!user) {
                user = await storage.createUser({
                  email,
                  firstName: claims.first_name || '',
                  lastName: claims.last_name || '',
                  profileImageUrl: claims.profile_image_url || '',
                  provider: 'replit',
                  providerId: claims.sub
                });
              }

              if (!user || !user.id) {
                return done(new Error('Failed to create or retrieve user'));
              }

              return done(null, user);
            } catch (error) {
              console.error('Replit OAuth error:', error);
              return done(error);
            }
          }
        )
      );

      // Replit OAuth routes
      app.get("/api/auth/replit", passport.authenticate("replit"));
      app.get("/api/auth/replit/callback",
        passport.authenticate("replit", { failureRedirect: "/auth?error=replit_failed" }),
        (req, res) => {
          res.redirect("/?auth=success");
        }
      );
    } catch (error) {
      console.error('Failed to configure Replit OAuth:', error);
      // Fallback to header-based auth for development
      app.get("/api/auth/replit", (req, res) => {
        const userId = req.headers['x-replit-user-id'] as string;
        const userName = req.headers['x-replit-user-name'] as string;
        const userEmail = `${userName}@replit.com`;
        
        if (userId && userName) {
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
      });
    }
  } else {
    app.get("/api/auth/replit", (req, res) => {
      res.status(501).json({ message: "Replit OAuth not configured" });
    });
  }

  // OAuth provider status endpoint
  app.get("/api/auth/providers", (req, res) => {
    const providers = {
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      facebook: !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
      twitter: !!(process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET),
      replit: !!(process.env.REPL_ID && process.env.REPLIT_DOMAINS)
    };
    
    res.json(providers);
  });

  // Password reset routes
  app.post("/api/auth/forgot-password", authRateLimit('forgot_password'), validateContentType, async (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    try {
      console.log('🔍 DEBUG: Forgot password request started');
      const { email } = req.body;
      console.log('🔍 DEBUG: Email received:', email ? email.substring(0, 5) + '***' : 'undefined');

      if (!email) {
        console.log('🔍 DEBUG: Email validation failed - no email provided');
        auditLog('forgot_password_validation_failed', undefined, { clientIP });
        return res.status(400).json({ message: "Email is required" });
      }

      const sanitizedEmail = sanitizeInput(email).toLowerCase();
      console.log('🔍 DEBUG: Sanitized email:', sanitizedEmail.substring(0, 5) + '***');

      if (!validateEmail(sanitizedEmail)) {
        console.log('🔍 DEBUG: Email format validation failed');
        auditLog('forgot_password_invalid_email', undefined, { email: sanitizedEmail.substring(0, 5) + '***', clientIP });
        return res.status(400).json({ message: "Invalid email format" });
      }

      console.log('🔍 DEBUG: Looking up user by email...');
      const user = await storage.getUserByEmail(sanitizedEmail);
      console.log('🔍 DEBUG: User found:', user ? `ID: ${user.id}, Provider: ${user.provider}` : 'null');
      
      // Always return success to prevent email enumeration attacks
      if (!user || user.provider !== 'local') {
        console.log('🔍 DEBUG: User not found or not local provider - returning success anyway');
        auditLog('forgot_password_user_not_found', undefined, { email: sanitizedEmail.substring(0, 5) + '***', clientIP });
        return res.json({ message: "If an account exists with this email, you will receive password reset instructions." });
      }

      // Generate secure reset token
      console.log('🔍 DEBUG: Generating reset token...');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      console.log('🔍 DEBUG: Reset token generated, length:', resetToken.length);
      console.log('🔍 DEBUG: Expires at:', expiresAt.toISOString());
      console.log('🔍 DEBUG: User ID type:', typeof user.id, 'Value:', user.id);

      console.log('🔍 DEBUG: About to create password reset token...');
      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);
      console.log('🔍 DEBUG: Password reset token created successfully');

      // Generate reset URL
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      console.log('🔍 DEBUG: Reset URL generated:', resetUrl.replace(resetToken, 'HIDDEN_TOKEN'));

      // Send password reset email
      console.log('🔍 DEBUG: Attempting to send email...');
      const emailSent = await emailService.sendEmail({
        to: user.email,
        subject: "Password Reset - DiSO Webs",
        html: emailService.generatePasswordResetEmail(resetUrl, user.firstName || 'there')
      });
      console.log('🔍 DEBUG: Email sent result:', emailSent);

      if (emailSent) {
        auditLog('forgot_password_success', user.id, { email: sanitizedEmail.substring(0, 5) + '***', clientIP });
      } else {
        auditLog('forgot_password_email_failed', user.id, { email: sanitizedEmail.substring(0, 5) + '***', clientIP });
      }

      console.log('🔍 DEBUG: Forgot password process completed successfully');
      res.json({ message: "If an account exists with this email, you will receive password reset instructions." });
    } catch (error) {
      console.error("🔍 DEBUG: Forgot password error details:");
      console.error("Error message:", (error as Error).message);
      console.error("Error stack:", (error as Error).stack);
      console.error("Full error object:", error);
      auditLog('forgot_password_error', undefined, { error: (error as Error).message, clientIP });
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", authRateLimit('reset_password'), validateContentType, async (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        auditLog('reset_password_validation_failed', undefined, { clientIP });
        return res.status(400).json({ message: "Token and password are required" });
      }

      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        auditLog('reset_password_weak_password', undefined, { clientIP });
        return res.status(400).json({ message: passwordCheck.message });
      }

      const resetTokenRecord = await storage.getPasswordResetToken(token);
      
      if (!resetTokenRecord || resetTokenRecord.used || resetTokenRecord.expiresAt < new Date()) {
        auditLog('reset_password_invalid_token', undefined, { clientIP });
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const user = await storage.getUser(resetTokenRecord.userId);
      if (!user) {
        auditLog('reset_password_user_not_found', undefined, { clientIP });
        return res.status(400).json({ message: "Invalid reset token" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(password);

      // Update user password
      await storage.updateUserPassword(user.id, hashedPassword);

      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(token);

      // Clean up expired tokens
      await storage.cleanupExpiredPasswordResetTokens();

      auditLog('reset_password_success', user.id, { email: user.email.substring(0, 5) + '***', clientIP });

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      auditLog('reset_password_error', undefined, { error: (error as Error).message, clientIP });
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
}

export const isAuthenticated = async (req: any, res: any, next: any) => {
  try {
    console.log('🔍 [AUTH DEBUG] Starting authentication check');
    console.log('🔍 [AUTH DEBUG] Session exists:', !!req.session);
    console.log('🔍 [AUTH DEBUG] Session ID:', req.sessionID);
    
    if (req.session) {
      console.log('🔍 [AUTH DEBUG] Session data:', {
        userId: req.session.userId,
        passport: req.session.passport,
        sessionKeys: Object.keys(req.session)
      });
    }
    
    console.log('🔍 [AUTH DEBUG] req.user exists:', !!req.user);
    console.log('🔍 [AUTH DEBUG] req.isAuthenticated():', req.isAuthenticated ? req.isAuthenticated() : 'N/A');
    
    // Ensure session is loaded from PostgreSQL database
    if (!req.session) {
      console.log('❌ [AUTH DEBUG] No session found');
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Check custom session userId first (from our login system)
    if ((req.session as any).userId) {
      const userId = (req.session as any).userId;
      console.log('🔍 [AUTH DEBUG] Found custom userId in session:', userId);
      const user = await storage.getUserById(userId);
      if (user) {
        console.log('✅ [AUTH DEBUG] User found via custom session:', user.email);
        req.user = user;
        return next();
      } else {
        console.log('❌ [AUTH DEBUG] User not found for userId:', userId);
      }
    }

    // Fallback check for passport session
    if (req.session.passport && req.session.passport.user) {
      const passportUserId = typeof req.session.passport.user === 'object' 
        ? req.session.passport.user.id 
        : req.session.passport.user;
      
      console.log('🔍 [AUTH DEBUG] Found passport userId:', passportUserId);
      
      if (passportUserId) {
        const user = await storage.getUserById(passportUserId);
        if (user) {
          console.log('✅ [AUTH DEBUG] User found via passport session:', user.email);
          req.user = user;
          return next();
        } else {
          console.log('❌ [AUTH DEBUG] User not found for passport userId:', passportUserId);
        }
      }
    }
    
    // Final fallback for req.user
    if (req.user) {
      console.log('✅ [AUTH DEBUG] User found via req.user:', req.user.email);
      return next();
    }
    
    console.log('❌ [AUTH DEBUG] Authentication failed - no valid user found');
    return res.status(401).json({ message: "Authentication required" });
  } catch (error) {
    console.error('❌ [AUTH DEBUG] Authentication middleware error:', error);
    res.status(401).json({ message: "Authentication required" });
  }
};