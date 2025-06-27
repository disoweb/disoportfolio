import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as TwitterStrategy } from "passport-twitter";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Express } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
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
import { createSessionMiddleware, SessionManager, authenticateRequest } from "./sessionManager";
import session from "express-session";

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
  // Configure session middleware using our session manager
  const sessionConfig = createSessionMiddleware({
    secret: process.env.SESSION_SECRET || 'dev-secret-key-for-replit-development',
    databaseUrl: process.env.DATABASE_URL,
    cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    cookieName: 'diso.sid'
  });

  app.set("trust proxy", 1);
  app.use(session(sessionConfig));
  
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

      // Use SessionManager to create a reliable session after registration
      try {
        // Create user session using our robust session manager
        await SessionManager.createUserSession(req, user, 'local');
        
        auditLog('register_success', user.id, { email: sanitizedEmail.substring(0, 5) + '***', clientIP });
        
        const sanitizedUser = { ...user };
        delete (sanitizedUser as any).password;
        
        console.log('🚀 REGISTER: Session created successfully for user:', sanitizedUser.id);
        
        res.status(201).json({ 
          user: sanitizedUser,
          message: "User created successfully"
        });
      } catch (sessionError) {
        console.error('🚀 REGISTER: Session creation error:', sessionError);
        auditLog('register_session_failed', user.id, { email: sanitizedEmail.substring(0, 5) + '***', clientIP, error: (sessionError as Error).message });
        
        // Even if session creation fails, user was created successfully
        const sanitizedUser = { ...user };
        delete (sanitizedUser as any).password;
        
        res.status(201).json({ 
          user: sanitizedUser,
          message: "User created successfully. Please login."
        });
      }
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
      // Use our session manager to get the current user
      const user = await SessionManager.getCurrentUser(req);
      
      if (user) {
        const sanitizedUser = { ...user };
        delete (sanitizedUser as any).password;
        return res.json(sanitizedUser);
      }
      
      res.json(null);
    } catch (error) {
      console.error('[AUTH] Error getting user:', error);
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

// Export our authentication middleware from sessionManager
export const isAuthenticated = authenticateRequest;