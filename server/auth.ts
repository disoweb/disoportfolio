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
  // Session configuration - use memory store for development to avoid DB connection issues
  let sessionStore;
  
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    const PostgresSessionStore = connectPg(session);
    sessionStore = new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: "sessions",
      errorLog: (error: any) => {
        console.error('Session store error:', error);
      }
    });
    
    sessionStore.on('connect', () => {
      console.log('Session store connected successfully');
    });

    sessionStore.on('disconnect', () => {
      console.log('Session store disconnected');
    });

    sessionStore.on('error', (error) => {
      console.error('Session store error:', error);
    });
  } else {
    // Use memory store for development
    console.log('Using memory store for sessions in development');
    sessionStore = undefined; // Express session will use memory store by default
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev-secret-key-for-replit-development',
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
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

  // Auth routes
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, companyName, phone } = req.body;

      // Validation
      if (!email || !password || !firstName) {
        return res.status(400).json({ message: "Email, password, and first name are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await storage.createUser({
        email,
        password: await hashPassword(password),
        firstName,
        lastName,
        companyName,
        phone,
        provider: 'local'
      });

      if (!user || !user.id) {
        return res.status(500).json({ message: "User creation failed" });
      }

      // Return user without automatic login to avoid session issues
      const sanitizedUser = { ...user };
      delete sanitizedUser.password;
      res.status(201).json({ 
        user: sanitizedUser,
        message: "Registration successful. Please log in with your credentials."
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }

      // Manually set session instead of using req.login to avoid passport issues
      if (req.session) {
        req.session.passport = { user: user.id };
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Login failed" });
          }
          
          const sanitizedUser = { ...user };
          delete sanitizedUser.password;
          res.json({ user: sanitizedUser });
        });
      } else {
        res.status(500).json({ message: "Session not available" });
      }
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    if (!req.user) {
      return res.json({ message: "Already logged out" });
    }
    
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Session destroy error:", sessionErr);
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      // Check session directly for user
      if (req.session && req.session.passport && req.session.passport.user) {
        const user = await storage.getUser(req.session.passport.user);
        if (user) {
          const sanitizedUser = { ...user };
          delete sanitizedUser.password;
          return res.json(sanitizedUser);
        }
      }
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

export const isAuthenticated = (req: any, res: any, next: any) => {
  // Check session directly due to passport serialization issues
  if (req.session && req.session.passport && req.session.passport.user) {
    // Manually attach user to request if needed
    if (!req.user) {
      storage.getUser(req.session.passport.user).then(user => {
        req.user = user;
        next();
      }).catch(() => {
        return res.status(401).json({ message: "Authentication required" });
      });
    } else {
      next();
    }
  } else {
    return res.status(401).json({ message: "Authentication required" });
  }
};